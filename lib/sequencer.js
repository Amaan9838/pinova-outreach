import dbConnect from './mongodb.js';
import Campaign from '../models/Campaign.js';
import Message from '../models/Message.js';
import Prospect from '../models/Prospect.js';
import Mailbox from '../models/MailboxFixed.js';
import Suppression from '../models/Suppression.js';
import { SMTPService } from './smtp.js';
import { v4 as uuidv4 } from 'uuid';

export class SequencerService {
  static async processSequences() {
    await dbConnect();
    
    console.log('=== PROCESSING SEQUENCES ===');
    
    const activeCampaigns = await Campaign.find({ 
      status: 'active' 
    }).populate('mailboxes');

    console.log(`Found ${activeCampaigns.length} active campaigns`);

    for (const campaign of activeCampaigns) {
      console.log(`Processing campaign: ${campaign.name} (${campaign._id})`);
      await this.processCampaignSequence(campaign);
    }
    
    console.log('=== SEQUENCE PROCESSING COMPLETE ===');
  }

  static async processCampaignSequence(campaign) {
    const now = new Date();
    
    console.log(`Campaign "${campaign.name}" has ${campaign.prospects.length} prospects`);
    
    // Debug: Show all prospects and their status
    campaign.prospects.forEach((prospect, index) => {
      console.log(`Prospect ${index + 1}:`, {
        prospectId: prospect.prospectId,
        status: prospect.status,
        currentStep: prospect.currentStep,
        nextSendAt: prospect.nextSendAt,
        isReady: prospect.status === 'active' && prospect.nextSendAt && prospect.nextSendAt <= now
      });
    });
    
    // Find prospects ready for next step
    const readyProspects = campaign.prospects.filter(prospect => 
      prospect.status === 'active' && 
      prospect.nextSendAt && 
      prospect.nextSendAt <= now
    );

    console.log(`Found ${readyProspects.length} prospects ready for sending out of ${campaign.prospects.length} total`);
    
    if (readyProspects.length === 0) {
      console.log('No prospects ready for sending in this campaign');
      return;
    }

    for (const prospectData of readyProspects) {
      try {
        console.log(`Processing prospect ${prospectData.prospectId} - Step ${prospectData.currentStep}`);
        await this.sendNextStep(campaign, prospectData);
      } catch (error) {
        console.error(`Error processing prospect ${prospectData.prospectId}:`, error);
      }
    }
  }

  static async sendNextStep(campaign, prospectData) {
    await dbConnect();
    
    console.log(`=== SENDING NEXT STEP ===`);
    console.log(`Campaign: ${campaign.name}`);
    console.log(`Prospect ID: ${prospectData.prospectId}`);
    console.log(`Current Step: ${prospectData.currentStep}`);
    
    const prospect = await Prospect.findById(prospectData.prospectId);
    if (!prospect || prospect.status !== 'active') {
      console.log(`Prospect not found or inactive:`, { 
        found: !!prospect, 
        status: prospect?.status 
      });
      return;
    }
    
    console.log(`Prospect found: ${prospect.firstName} ${prospect.lastName} (${prospect.email})`);

    // Check if email is suppressed
    const suppressedEmail = await Suppression.findOne({ email: prospect.email });
    if (suppressedEmail) {
      console.log(`Email ${prospect.email} is suppressed, stopping sequence`);
      prospectData.status = 'stopped';
      await campaign.save();
      return;
    }

    // Get current step
    const currentStep = campaign.sequence.find(
      step => step.stepNumber === prospectData.currentStep
    );
    
    console.log(`Looking for step ${prospectData.currentStep}, found:`, !!currentStep);
    
    if (!currentStep) {
      console.log(`Step ${prospectData.currentStep} not found, marking prospect as completed`);
      prospectData.status = 'completed';
      await campaign.save();
      return;
    }
    
    console.log(`Current step details:`, {
      stepNumber: currentStep.stepNumber,
      subject: currentStep.subject,
      waitHours: currentStep.waitHours
    });

    // Check previous message conditions
    if (prospectData.currentStep > 1) {
      const lastMessage = await Message.findOne({
        campaignId: campaign._id,
        prospectId: prospect._id,
        stepNumber: prospectData.currentStep - 1
      });

      if (lastMessage) {
        const shouldContinue = this.checkStepConditions(lastMessage, currentStep);
        if (!shouldContinue) {
          prospectData.status = 'stopped';
          await campaign.save();
          return;
        }
      }
    }

    console.log(`Getting current step ${prospectData.currentStep} from sequence`);
    
    // Select mailbox (round-robin with daily limits)
    console.log(`Campaign has ${campaign.mailboxes.length} mailboxes`);
    const availableMailbox = await this.selectAvailableMailbox(campaign.mailboxes);
    if (!availableMailbox) {
      console.log('No available mailbox found, rescheduling for later');
      // No available mailbox, try again later
      prospectData.nextSendAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour later
      await campaign.save();
      return;
    }
    
    console.log(`Selected mailbox: ${availableMailbox.fromName} (${availableMailbox.fromEmail})`);

    // Generate personalized content
    let personalizedContent = this.personalizeContent(
      currentStep.template, 
      prospect, 
      campaign
    );
    
    let personalizedSubject = this.personalizeContent(
      currentStep.subject, 
      prospect, 
      campaign
    );
    
    // Replace placeholder [Your name] with actual sender name
    personalizedContent = personalizedContent.replace(/\[Your name\]/g, availableMailbox.fromName);
    
    // Convert \n to proper line breaks
    personalizedContent = personalizedContent.replace(/\\n/g, '\n');

    // Create tracking ID
    const trackingId = uuidv4();

    // Create message record
    const headerMessageId = `<${trackingId}@${availableMailbox.domain}>`;
    const message = new Message({
      campaignId: campaign._id,
      prospectId: prospect._id,
      mailboxId: availableMailbox._id,
      stepNumber: prospectData.currentStep,
      messageId: `seq-${trackingId}`,
      headerMessageId,
      trackingId,
      subject: personalizedSubject,
      content: personalizedContent,
      status: 'queued'
    });

    await message.save();

    // Threading: set In-Reply-To/References for follow-ups
    let inReplyTo = null;
    let references = [];
    if (prospectData.currentStep > 1) {
      const prevMessage = await Message.findOne({
        campaignId: campaign._id,
        prospectId: prospect._id,
        stepNumber: prospectData.currentStep - 1
      });
      const prevHeaderId = prevMessage?.headerMessageId;
      if (prevHeaderId) {
        inReplyTo = prevHeaderId;
        references = [prevHeaderId];
      }
    }

    // Send email via SMTP
    const result = await SMTPService.sendEmail({
      mailbox: availableMailbox,
      to: prospect.email,
      subject: personalizedSubject,
      html: personalizedContent,
      text: this.htmlToText(personalizedContent),
      trackingId: trackingId,
      messageId: message._id.toString(),
      headerMessageId: message.headerMessageId,
      inReplyTo,
      references
    });

    if (result.success) {
    // Update message
    message.status = 'sent';
    message.sesMessageId = result.messageId;
    message.sentAt = new Date();
    message.events.push({
    type: 'sent',
    timestamp: new Date()
    });

         // If SMTP accepted the message, mark delivered
    if (result.accepted) {
      // Consider delivered for UI purposes, but don't add a delivered event here.
      // Webhook will record the canonical delivered event and update stats once.
      message.status = 'delivered';
      message.deliveredAt = new Date();
    }

      await message.save();
 
      // Update campaign stats
      campaign.stats.sent += 1;
 
      // Update prospect for next step
      prospectData.currentStep += 1;
      const nextStep = campaign.sequence.find(
        step => step.stepNumber === prospectData.currentStep
      );
      
      if (nextStep) {
        prospectData.nextSendAt = new Date(
          Date.now() + nextStep.waitHours * 60 * 60 * 1000
        );
      } else {
        prospectData.status = 'completed';
      }

      // Update mailbox daily count
      availableMailbox.dailySent += 1;
      availableMailbox.lastSent = new Date();
      await availableMailbox.save();

      await campaign.save();

    } else {
      // Update message with error
      message.status = 'failed';
      message.errorMessage = result.error;
      await message.save();

      // Reschedule for later
      prospectData.nextSendAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes later
      await campaign.save();
    }
  }

  static checkStepConditions(lastMessage, currentStep) {
    const hasOpened = lastMessage.events.some(event => event.type === 'opened');
    const hasReplied = lastMessage.events.some(event => event.type === 'replied');
    const hasBounced = lastMessage.events.some(event => event.type === 'bounced');

    if (hasReplied && currentStep.conditions.ifReplied === 'stop') {
      return false;
    }

    if (hasBounced && currentStep.conditions.ifBounced === 'stop') {
      return false;
    }

    if (hasOpened && currentStep.conditions.ifOpened === 'stop') {
      return false;
    }

    if (hasOpened && currentStep.conditions.ifOpened === 'skip_next') {
      // Skip this step
      return false;
    }

    return true;
  }

  static async selectAvailableMailbox(mailboxes) {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    console.log(`Selecting from ${mailboxes.length} mailboxes:`);
    
    for (const mailbox of mailboxes) {
      // Reset daily count if it's a new day
      if (!mailbox.lastSent || mailbox.lastSent < todayStart) {
        mailbox.dailySent = 0;
      }

      console.log(`Mailbox ${mailbox.fromEmail}: status=${mailbox.status}, dailySent=${mailbox.dailySent}, dailyCap=${mailbox.dailyCap}`);

      if (mailbox.status === 'active' && mailbox.dailySent < mailbox.dailyCap) {
        console.log(`Selected mailbox: ${mailbox.fromEmail}`);
        return mailbox;
      }
    }
    
    console.log('No available mailbox found');
    return null;
  }

  static personalizeContent(template, prospect, campaign) {
    let content = template;
    
    // Replace variables
    content = content.replace(/\{\{first_name\}\}/g, prospect.firstName || '');
    content = content.replace(/\{\{last_name\}\}/g, prospect.lastName || '');
    content = content.replace(/\{\{company\}\}/g, prospect.company || '');
    content = content.replace(/\{\{city\}\}/g, prospect.city || '');
    content = content.replace(/\{\{neighborhood\}\}/g, prospect.neighborhood || '');
    content = content.replace(/\{\{listing_price\}\}/g, prospect.listingPrice || '');
    content = content.replace(/\{\{campaign_name\}\}/g, campaign.name || '');
    
    // Add custom fields
    if (prospect.customFields) {
      for (const [key, value] of prospect.customFields) {
        const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
        content = content.replace(regex, value);
      }
    }
    
    return content;
  }

  static htmlToText(html) {
    // Simple HTML to text conversion
    return html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<[^>]*>/g, '')
      .trim();
  }
}
