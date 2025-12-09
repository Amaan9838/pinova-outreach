import dbConnect from './mongodb.js';
import Message from '../models/Message.js';
import Suppression from '../models/Suppression.js';
import Mailbox from '../models/MailboxFixed.js';
import Prospect from '../models/Prospect.js';
import Campaign from '../models/Campaign.js';
import CampaignProspect from '../models/CampaignProspect.js';
import Imap from 'imap';
import { simpleParser } from 'mailparser';
import crypto from 'crypto';

export class InboxMonitorService {
  static async checkReplies() {
    await dbConnect();
    
    console.log('=== CHECKING FOR REPLIES ===');
    
    const activeMailboxes = await Mailbox.find({ status: 'active' });

    console.log(`Found ${activeMailboxes.length} active mailboxes`);

    let checked = 0;
    for (const mailbox of activeMailboxes) {
      try {
        const imapConfig = this.resolveImapConfig(mailbox);
        if (!imapConfig) {
          console.log(`Skipping ${mailbox.fromEmail}: no IMAP configuration available`);
          continue;
        }
        await this.checkMailboxReplies(mailbox, imapConfig);
        checked++;
      } catch (error) {
        console.error(`Error checking mailbox ${mailbox.fromEmail}:`, error);
      }
    }
    
    console.log(`=== REPLY CHECK COMPLETE (${checked} mailboxes checked) ===`);
  }

  static resolveImapConfig(mailbox) {
    // Prefer explicit IMAP config if present
    if (mailbox.imapConfiguration && mailbox.imapConfiguration.host) {
      return {
        user: mailbox.imapConfiguration.user,
        password: mailbox.imapConfiguration.password,
        host: mailbox.imapConfiguration.host,
        port: mailbox.imapConfiguration.port || 993,
        tls: mailbox.imapConfiguration.tls !== false
      };
    }

    // Fallback: infer from ISP or SMTP
    const isp = mailbox.isp;
    const smtp = mailbox.smtpConfiguration || {};

    const guess = { user: smtp.user, password: smtp.password, tls: true, port: 993 };

    if (isp === 'gmail') {
      return { ...guess, host: 'imap.gmail.com' };
    }
    if (isp === 'outlook') {
      return { ...guess, host: 'outlook.office365.com' };
    }
    if (isp === 'yahoo') {
      return { ...guess, host: 'imap.mail.yahoo.com' };
    }
    if (isp === 'godaddy') {
      return { ...guess, host: 'imap.secureserver.net' };
    }

    // Try to convert smtp host to imap host with robust mapping
    if (smtp.host) {
      let imapHost = smtp.host;

      // Common providers
      if (/smtp\.gmail\.com/i.test(imapHost)) imapHost = 'imap.gmail.com';
      else if (/(smtp|outlook)\.office365\.com/i.test(imapHost)) imapHost = 'outlook.office365.com';
      else if (/smtp\.mail\.yahoo\.com/i.test(imapHost)) imapHost = 'imap.mail.yahoo.com';
      else if (/secureserver\.net/i.test(imapHost)) imapHost = 'imap.secureserver.net';
      else {
        // Generic rule: smtp / smtpout -> imap
        imapHost = imapHost.replace(/^smtp(out)?\./i, 'imap.').replace(/^smtp\./i, 'imap.');
      }

      return { ...guess, host: imapHost };
    }

    return null;
  }

  static async checkMailboxReplies(mailbox, imapConfig) {
    return new Promise((resolve, reject) => {
      const imap = new Imap({
        user: imapConfig.user,
        password: imapConfig.password,
        host: imapConfig.host,
        port: imapConfig.port,
        tls: imapConfig.tls !== false,
        tlsOptions: { rejectUnauthorized: false }
      });

      let maxUID = mailbox.lastProcessedUid || 0;

      imap.once('ready', () => {
        imap.openBox('INBOX', false, (err, box) => {
          if (err) {
            console.error('Error opening inbox:', err);
            reject(err);
            return;
          }

          // Choose search criteria based on checkpoint
          const criteria = (mailbox.lastProcessedUid && mailbox.lastProcessedUid > 0)
            ? [['UID', `${mailbox.lastProcessedUid + 1}:*`]]
            : ['UNSEEN'];

          imap.search(criteria, (err, results) => {
            if (err) {
              console.error('Error searching emails:', err);
              imap.end();
              reject(err);
              return;
            }

            if (!results || results.length === 0) {
              console.log(`No new emails in ${mailbox.fromEmail} (criteria=${JSON.stringify(criteria)})`);
              imap.end();
              resolve();
              return;
            }

            console.log(`Found ${results.length} emails to process in ${mailbox.fromEmail}`);

            const fetch = imap.fetch(results, { bodies: '', markSeen: true, uid: true });
            
            fetch.on('message', (msg) => {
              let thisUid = null;
              msg.on('attributes', (attrs) => {
                if (attrs && attrs.uid) {
                  thisUid = attrs.uid;
                  if (thisUid > maxUID) maxUID = thisUid;
                }
              });
              msg.on('body', (stream) => {
                simpleParser(stream, async (err, parsed) => {
                  if (err) {
                    console.error('Error parsing email:', err);
                    return;
                  }

                  try {
                    await this.processReply(mailbox, parsed);
                  } catch (error) {
                    console.error('Error processing reply:', error);
                  }
                });
              });
            });

            fetch.once('end', async () => {
              try {
                if (maxUID && maxUID > (mailbox.lastProcessedUid || 0)) {
                  await Mailbox.updateOne({ _id: mailbox._id }, { $max: { lastProcessedUid: maxUID } });
                  console.log(`Updated lastProcessedUid for ${mailbox.fromEmail} to ${maxUID}`);
                }
              } catch (e) {
                console.error('Failed to update lastProcessedUid:', e);
              }
              imap.end();
              resolve();
            });
          });
        });
      });

      imap.once('error', (err) => {
        console.error('IMAP connection error:', err);
        reject(err);
      });

      imap.connect();
    });
  }

  static async processReply(mailbox, parsedEmail) {
    try {
      const fromEmail = parsedEmail.from.value[0].address.toLowerCase();
      const subject = parsedEmail.subject || '';
      const content = parsedEmail.text || parsedEmail.html || '';
      
      console.log(`Processing reply from ${fromEmail} with subject: ${subject}`);

      // Try to match original message by threading headers first
      const inReplyTo = parsedEmail.inReplyTo;
      const refArray = Array.isArray(parsedEmail.references)
      ? parsedEmail.references
      : (parsedEmail.references ? [parsedEmail.references] : []);
      const possibleIds = [inReplyTo, ...refArray].filter(Boolean);

      let originalMessage = null;
      if (possibleIds.length) {
        originalMessage = await Message.findOne({
               mailboxId: mailbox._id,
          headerMessageId: { $in: possibleIds }
      }).populate('prospectId campaignId');
      }

           // Fallback: match by prospect email when header match not available
      if (!originalMessage) {
             const prospect = await Prospect.findOne({ email: fromEmail });
        if (prospect) {
          originalMessage = await Message.findOne({
            mailboxId: mailbox._id,
            prospectId: prospect._id
          })
          .sort({ createdAt: -1 })
          .populate('prospectId campaignId');
        }
      }

      if (!originalMessage) {
        console.log(`No original message found for reply from ${fromEmail}`);
        return;
      }

      console.log(`Found original message: ${originalMessage._id}`);

      // Compute a stable hash of reply content to guard against duplicate ingestion
      const rawText = (parsedEmail.text || '') + '|' + (parsedEmail.html || '');
      const replyHash = crypto.createHash('sha1').update(rawText.trim().toLowerCase()).digest('hex');

      // De-duplicate: skip if this exact reply (by messageId or hash) was recorded
      const alreadyRecorded = originalMessage.events?.some(e => e.type === 'replied' && (e.data?.messageId === parsedEmail.messageId || e.data?.replyHash === replyHash));
      if (alreadyRecorded) {
        console.log('Reply already recorded (by messageId or hash), skipping');
        return;
      }

      // Check if this is actually a bounce or auto-reply
      const isBounce = this.detectBounce(parsedEmail);
      const isAutoReply = this.detectAutoReply(parsedEmail);

      if (isBounce) {
        console.log('Detected bounce email');
        await this.handleBounce(originalMessage, parsedEmail);
        return;
      }

      if (isAutoReply) {
        console.log('Detected auto-reply, ignoring');
        return;
      }

      // This is a genuine reply
      await this.handleReply(originalMessage, parsedEmail, replyHash);
      
    } catch (error) {
      console.error('Error processing reply:', error);
    }
  }

  static async handleReply(originalMessage, parsedEmail, replyHash) {
    try {
      console.log('Handling genuine reply');
      const replyKey = parsedEmail.messageId || replyHash;

      const eventDoc = {
        type: 'replied',
        timestamp: new Date(),
        data: {
          fromEmail: parsedEmail.from?.value?.[0]?.address,
          subject: parsedEmail.subject,
          text: (parsedEmail.text || '').slice(0, 10000),
          html: (parsedEmail.html || '').slice(0, 10000),
          messageId: parsedEmail.messageId,
          replyHash
        }
      };

      // Atomic, idempotent update: only add if replyKey not seen
      const res = await Message.updateOne(
        { _id: originalMessage._id, processedReplyKeys: { $ne: replyKey } },
        {
          $addToSet: { processedReplyKeys: replyKey },
          $push: { events: eventDoc },
          $set: { status: 'replied', repliedAt: new Date() }
        }
      );

      if (res.modifiedCount === 0) {
        console.log('Reply already processed (atomic check)');
        return;
      }

      // Stop ALL scheduling systems atomically
      await this.stopAllSchedulingForProspect(
        originalMessage.campaignId, 
        originalMessage.prospectId._id
      );

      // AI Reply Analysis - classify sentiment and suggest actions
      try {
        const { aiService } = await import('./services/vertexAI.js');
        const replyText = parsedEmail.text || parsedEmail.html || '';
        const originalSubject = originalMessage.subject || '';
        
        console.log('🧠 Analyzing reply with AI...');
        const analysis = await aiService.analyzeReply({
          replyText,
          originalSubject,
          prospectName: originalMessage.prospectId?.firstName || 'Prospect'
        });
        
        // Store analysis in CampaignProspect for pipeline
        if (analysis) {
          await CampaignProspect.updateOne(
            { 
              campaign: originalMessage.campaignId, 
              prospect: originalMessage.prospectId._id 
            },
            { 
              $set: { 
                replyAnalysis: {
                  sentiment: analysis.sentiment,
                  sentimentScore: analysis.sentimentScore,
                  intent: analysis.intent,
                  urgency: analysis.urgency || 'medium',
                  suggestedAction: analysis.suggestedAction,
                  suggestedResponse: analysis.suggestedResponse,
                  shouldEscalate: analysis.shouldEscalate || false,
                  analyzedAt: new Date()
                }
              }
            }
          );
          console.log(`✅ AI Analysis complete: ${analysis.sentiment} sentiment, ${analysis.intent} intent`);
        }
      } catch (aiError) {
        console.error('AI analysis failed (non-critical):', aiError.message);
        // Continue even if AI fails
      }

      console.log('Reply processed successfully - all scheduling stopped');
      
    } catch (error) {
      console.error('Error handling reply:', error);
    }
  }

  /**
   * CRITICAL FIX: Stop all scheduling systems when prospect replies
   * This addresses the architectural problem where reply processing
   * only updated campaign prospect status but not ScheduledEmail records
   */
  static async stopAllSchedulingForProspect(campaignId, prospectId) {
    console.log(`Stopping all scheduling for prospect ${prospectId} in campaign ${campaignId}`);
    
    try {
      // 1. Update CampaignProspect status (current system)
      const campaignProspectUpdate = await CampaignProspect.updateOne(
        { 
          campaign: campaignId,
          prospect: prospectId 
        },
        { 
          $set: { 
            status: 'replied',
            repliedAt: new Date(),
            nextSendAt: null
          }
        }
      );
      
      // 2. Update campaign stats
      await Campaign.updateOne(
        { _id: campaignId },
        { $inc: { 'stats.replied': 1 } }
      );
      
      console.log(`CampaignProspect update: ${campaignProspectUpdate.modifiedCount} records`);
      
      // 3. Mark prospect as replied to prevent future campaigns from emailing
      await Prospect.updateOne(
        { _id: prospectId },
        { $set: { lastRepliedAt: new Date() } }
      );
      
      console.log('All scheduling systems updated successfully');
      
    } catch (error) {
      console.error('Error stopping scheduling systems:', error);
      throw error; // Re-throw to handle in caller
    }
  }

  static async handleBounce(originalMessage, parsedEmail) {
    try {
      console.log('Handling bounce email');
      
      // Add bounce event
      originalMessage.events.push({
        type: 'bounced',
        timestamp: new Date(),
        data: {
          bounceType: 'hard', // Could be enhanced to detect soft vs hard
          reason: parsedEmail.subject || 'Email bounced'
        }
      });
      
      originalMessage.status = 'bounced';
      await originalMessage.save();

      // Update campaign stats
      const campaign = await Campaign.findById(originalMessage.campaignId);
      if (campaign) {
        campaign.stats.bounced += 1;
        await campaign.save();
      }

      // Add to suppression list
      const prospectEmail = originalMessage.prospectId.email;
      const existingSuppression = await Suppression.findOne({ email: prospectEmail });
      
      if (!existingSuppression) {
        const suppression = new Suppression({
          email: prospectEmail,
          reason: 'bounce',
          source: 'automatic'
        });
        await suppression.save();
        console.log(`Added ${prospectEmail} to suppression list`);
      }

      console.log('Bounce processed successfully');
      
    } catch (error) {
      console.error('Error handling bounce:', error);
    }
  }

  static detectBounce(parsedEmail) {
    const bounceIndicators = [
      'delivery failed',
      'undelivered',
      'returned mail',
      'mail delivery failed',
      'message not delivered',
      'user unknown',
      'mailbox unavailable',
      'recipient address rejected'
    ];
    
    const subject = (parsedEmail.subject || '').toLowerCase();
    const content = (parsedEmail.text || '').toLowerCase();
    
    return bounceIndicators.some(indicator => 
      subject.includes(indicator) || content.includes(indicator)
    );
  }

  static detectAutoReply(parsedEmail) {
    const autoReplyIndicators = [
      'out of office',
      'automatic reply',
      'auto-reply',
      'autoreply',
      'away message',
      'vacation',
      'do not reply',
      'noreply',
      'no-reply'
    ];
    
    const subject = (parsedEmail.subject || '').toLowerCase();
    const content = (parsedEmail.text || '').toLowerCase();
    const fromEmail = parsedEmail.from.value[0].address.toLowerCase();
    
    // Check for auto-reply patterns
    if (autoReplyIndicators.some(indicator => 
      subject.includes(indicator) || content.includes(indicator) || fromEmail.includes(indicator)
    )) {
      return true;
    }

    // Check for headers that indicate auto-reply
    if (parsedEmail.headers['auto-submitted'] || 
        parsedEmail.headers['x-auto-response-suppress']) {
      return true;
    }

    return false;
  }
}
