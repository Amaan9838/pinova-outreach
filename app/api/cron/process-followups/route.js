import { NextResponse } from 'next/server';
import dbConnect from '../../../../lib/mongodb.js';
import Campaign from '../../../../models/Campaign.js';
import Message from '../../../../models/Message.js';
import { SMTPService } from '../../../../lib/smtp.js';

export async function GET() {
  try {
    await dbConnect();
    
    const now = new Date();
    
    // Find messages that need follow-ups
    const messages = await Message.find({
      status: { $in: ['sent', 'delivered', 'opened'] },
      followUpAt: { $lte: now },
      followUpSent: { $ne: true }
    }).populate('campaignId prospectId');
    
    let processedCount = 0;
    let errors = [];
    
    for (const message of messages) {
      try {
        const campaign = message.campaignId;
        const prospect = message.prospectId;
        
        if (!campaign || !prospect || campaign.status !== 'active') {
          continue;
        }
        
        // Get follow-up settings from campaign
        const followUpSettings = campaign.followUpSettings || {
          enabled: false,
          stopOnReply: true,
          stopOnOpen: false,
          maxFollowUps: 3,
          followUpDelay: 3
        };
        
        if (!followUpSettings.enabled) continue;
        
        // Check stop conditions
        if (followUpSettings.stopOnReply && message.replied) {
          message.followUpSent = true;
          await message.save();
          continue;
        }
        
        if (followUpSettings.stopOnOpen && message.opened) {
          message.followUpSent = true;
          await message.save();
          continue;
        }
        
        // Check if we've reached max follow-ups for this message
        const existingFollowUps = await Message.countDocuments({
          originalMessageId: message._id,
          type: 'followup'
        });
        
        if (existingFollowUps >= followUpSettings.maxFollowUps) {
          message.followUpSent = true;
          await message.save();
          continue;
        }
        
        // Get follow-up templates from campaign
        const followUpTemplates = followUpSettings.followUpTemplates || [];
        if (followUpTemplates.length === 0) {
          // Skip if no follow-up templates are configured
          continue;
        }
        
        // Get the appropriate template based on follow-up number
        const templateIndex = Math.min(existingFollowUps, followUpTemplates.length - 1);
        const template = followUpTemplates[templateIndex];
        
        if (!template) continue;
        
        // Replace variables in follow-up template
        let subject = template.subject || `Re: ${message.subject}`;
        let content = template.content || '';
        
        const variables = {
          firstName: prospect.firstName || '',
          lastName: prospect.lastName || '',
          email: prospect.email || '',
          company: prospect.company || '',
          phone: prospect.phone || '',
          website: prospect.website || '',
          industry: prospect.industry || '',
          position: prospect.position || ''
        };
        
        Object.entries(variables).forEach(([key, value]) => {
          const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
          subject = subject.replace(regex, value);
          content = content.replace(regex, value);
        });
        
        // Create follow-up message record
        const followUpMessage = new Message({
          campaignId: campaign._id,
          prospectId: prospect._id,
          originalMessageId: message._id,
          stepNumber: message.stepNumber,
          subject,
          content,
          status: 'pending',
          type: 'followup',
          scheduledAt: now
        });
        
        await followUpMessage.save();
        
        // Get campaign mailbox for sending
        const mailboxId = campaign.options?.selectedMailbox || campaign.mailbox;
        if (!mailboxId) {
          errors.push(`No mailbox configured for campaign ${campaign.name}`);
          continue;
        }
        
        // Send follow-up email
        try {
          const smtpService = new SMTPService();
          const result = await smtpService.sendEmail({
            to: prospect.email,
            subject,
            html: content,
            mailboxId,
            campaignId: campaign._id,
            messageId: followUpMessage._id
          });
          
          if (result.success) {
            followUpMessage.status = 'sent';
            followUpMessage.sentAt = now;
            await followUpMessage.save();
            
            // Schedule next follow-up if not at max
            if (existingFollowUps + 1 < followUpSettings.maxFollowUps) {
              const nextFollowUpAt = new Date(now.getTime() + followUpSettings.followUpDelay * 24 * 60 * 60 * 1000);
              followUpMessage.followUpAt = nextFollowUpAt;
              await followUpMessage.save();
            } else {
              message.followUpSent = true;
              await message.save();
            }
            
            processedCount++;
          } else {
            throw new Error(result.error || 'Failed to send follow-up email');
          }
          
          
        } catch (emailError) {
          followUpMessage.status = 'failed';
          followUpMessage.error = emailError.message;
          await followUpMessage.save();
          errors.push(`Follow-up failed for ${prospect.email}: ${emailError.message}`);
        }
        
      } catch (messageError) {
        errors.push(`Message ${message._id}: ${messageError.message}`);
      }
    }
    
    return NextResponse.json({
      success: true,
      processedCount,
      errors: errors.length > 0 ? errors : null,
      timestamp: now.toISOString()
    });
    
  } catch (error) {
    console.error('Follow-up processing error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

export async function POST() {
  return GET();
}
