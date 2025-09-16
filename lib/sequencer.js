import dbConnect from './mongodb.js';
import Campaign from '../models/Campaign.js';
import CampaignProspect from '../models/CampaignProspect.js';
import Message from '../models/Message.js';
import Prospect from '../models/Prospect.js';

import Suppression from '../models/Suppression.js';
import { CampaignProspectService } from './services/CampaignProspectService.js';
import { SMTPService } from './smtp.js';
import { v4 as uuidv4 } from 'uuid';
import { CampaignNotificationService } from './campaignNotifications.js';

export class SequencerService {
  static async processSequences() {
    await dbConnect();

    console.log('=== PROCESSING SEQUENCES ===');

    // Process active campaigns
    const activeCampaigns = await Campaign.find({
      status: 'active'
    }).populate('mailboxes');

    console.log(`Found ${activeCampaigns.length} active campaigns`);

    for (const campaign of activeCampaigns) {
      console.log(`Processing campaign: ${campaign.name} (${campaign._id})`);
      await this.processCampaignSequence(campaign);
    }

    // Also process scheduled campaigns using CampaignProspect model
    await this.processScheduledProspects();

    console.log('=== SEQUENCE PROCESSING COMPLETE ===');
  }

  /**
   * Process prospects that are ready to send based on nextSendAt
   */
  static async processScheduledProspects() {
    console.log('Processing scheduled prospects...');

    // Find prospects ready to send
    const readyProspects = await CampaignProspect.findReadyToSend(null, 100);

    // Count pending prospects for logging
    const pendingCount = await CampaignProspectService.countPendingProspects();

    console.log(`Found ${readyProspects.length} prospects ready to send`);

    if (pendingCount > 0) {
      console.warn(`⚠️  ${pendingCount} prospects are pending and need activation to start sending emails`);

      // Get detailed pending stats by campaign for better logging
      try {
        const pendingByCampaign = await CampaignProspectService.getPendingProspectsByCampaign();
        if (pendingByCampaign.length > 0) {
          console.warn('📊 Pending prospects by campaign:');
          pendingByCampaign.forEach(stat => {
            console.warn(`   - "${stat.campaignName}" (${stat.campaignStatus}): ${stat.pendingCount} pending`);
          });
        }
      } catch (error) {
        console.error('Failed to get detailed pending stats:', error);
      }
    }

    for (const campaignProspect of readyProspects) {
      try {
        await this.sendToProspect(campaignProspect);
      } catch (error) {
        console.error(`Error sending to prospect ${campaignProspect.prospect?.email}:`, error);
      }
    }
  }

  static async processCampaignSequence(campaign) {
    // Get campaign prospects from CampaignProspect model
    const campaignProspects = await CampaignProspect.findByCampaign(campaign._id, 'active');

    console.log(`Campaign "${campaign.name}" has ${campaignProspects.length} active prospects`);

    // Debug: Show all prospects and their status
    campaignProspects.forEach((campaignProspect, index) => {
      console.log(`Prospect ${index + 1}:`, {
        prospectId: campaignProspect.prospect._id,
        email: campaignProspect.prospect.email,
        status: campaignProspect.status,
        currentStep: campaignProspect.sequenceStep,
        isReady: campaignProspect.status === 'active'
      });
    });

    console.log(`Found ${campaignProspects.length} prospects ready for sending`);

    if (campaignProspects.length === 0) {
      console.log('No prospects ready for sending in this campaign');
      return;
    }

    for (const campaignProspect of campaignProspects) {
      try {
        console.log(`Processing prospect ${campaignProspect.prospect._id} - Step ${campaignProspect.sequenceStep}`);
        await this.sendNextStepFromCampaignProspect(campaign, campaignProspect);
      } catch (error) {
        console.error(`Error processing prospect ${campaignProspect.prospect._id}:`, error);
      }
    }
  }

  /**
   * Send next step using CampaignProspect model (new method)
   */
  static async sendNextStepFromCampaignProspect(campaign, campaignProspect) {
    await dbConnect();

    console.log(`=== SENDING NEXT STEP (CampaignProspect) ===`);
    console.log(`Campaign: ${campaign.name}`);
    console.log(`Prospect ID: ${campaignProspect.prospect._id}`);
    console.log(`Current Step: ${campaignProspect.sequenceStep}`);

    const prospect = campaignProspect.prospect;
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
      campaignProspect.status = 'stopped';
      await campaignProspect.save();
      return;
    }

    // Get current step
    const currentStep = campaign.sequence.find(
      step => step.stepNumber === campaignProspect.sequenceStep
    );

    console.log(`Looking for step ${campaignProspect.sequenceStep}, found:`, !!currentStep);

    if (!currentStep) {
      console.log(`Step ${campaignProspect.sequenceStep} not found, marking prospect as completed`);
      await campaignProspect.markAsCompleted();
      
      // Check if campaign should be completed
      await this.checkCampaignCompletion(campaign._id);
      return;
    }

    console.log(`Current step details:`, {
      stepNumber: currentStep.stepNumber,
      subject: currentStep.subject
    });

    // Check previous message conditions
    if (campaignProspect.sequenceStep > 1) {
      const lastMessage = await Message.findOne({
        campaignId: campaign._id,
        prospectId: prospect._id,
        stepNumber: campaignProspect.sequenceStep - 1
      });

      if (lastMessage) {
        const shouldContinue = this.checkStepConditions(lastMessage, currentStep);
        if (!shouldContinue) {
          campaignProspect.status = 'stopped';
          await campaignProspect.save();
          return;
        }
      }
    }

    console.log(`Getting current step ${campaignProspect.sequenceStep} from sequence`);

    // Continue with the rest of the email sending logic...
    await this.sendEmailFromCampaignProspect(campaign, campaignProspect, currentStep);
  }

  /**
   * Send email using CampaignProspect model
   */
  static async sendEmailFromCampaignProspect(campaign, campaignProspect, currentStep) {
    const prospect = campaignProspect.prospect;

    // Select mailbox - support both new and old campaign structures
    let mailboxes = [];

    // NEW STRUCTURE: campaign.options.selectedMailbox (single mailbox)
    if (campaign.options?.selectedMailbox) {
      const selectedMailbox = await (await import('../models/MailboxFixed.js')).default.findById(campaign.options.selectedMailbox);
      if (selectedMailbox) {
        mailboxes = [selectedMailbox];
        console.log(`Using selected mailbox from options: ${selectedMailbox.fromEmail}`);
      }
    }

    // OLD STRUCTURE: campaign.mailboxes (array of mailboxes)
    if (mailboxes.length === 0 && campaign.mailboxes && campaign.mailboxes.length > 0) {
      console.log(`Using mailboxes array: ${campaign.mailboxes.length} mailboxes`);
      mailboxes = campaign.mailboxes;
    }

    if (mailboxes.length === 0) {
      console.log('No mailboxes found in campaign');
      return;
    }

    console.log(`Campaign has ${mailboxes.length} mailbox(es)`);
    const availableMailbox = await this.selectAvailableMailbox(mailboxes);
    if (!availableMailbox) {
      console.log('No available mailbox found');
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
      stepNumber: campaignProspect.sequenceStep,
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
    if (campaignProspect.sequenceStep > 1) {
      const prevMessage = await Message.findOne({
        campaignId: campaign._id,
        prospectId: prospect._id,
        stepNumber: campaignProspect.sequenceStep - 1
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
        message.status = 'delivered';
        message.deliveredAt = new Date();
      }

      await message.save();

      // Update campaign stats
      campaign.stats.sent += 1;
      await campaign.save();

      // Update CampaignProspect for next step
      await campaignProspect.recordEmailSent();

      // Check if there's a next step
      const nextStep = campaign.sequence.find(
        step => step.stepNumber === campaignProspect.sequenceStep + 1
      );

      if (nextStep) {
        // Schedule next step based on wait time
        const delayMinutes = (nextStep.waitMinutes || 0);
        const delayHours = (nextStep.waitHours || 0);
        const delayDays = (nextStep.waitDays || 0);

        // Get campaign timezone for proper scheduling
        const campaignTimezone = campaign.scheduling?.timezone || campaign.options?.timezone || 'UTC';

        await campaignProspect.scheduleNextStep(delayMinutes, delayHours, delayDays, campaignTimezone);
        campaignProspect.sequenceStep += 1;
      } else {
        // Mark as completed
        await campaignProspect.markAsCompleted();
        
        // Check if campaign should be completed
        await this.checkCampaignCompletion(campaign._id);
      }

      await campaignProspect.save();

      // Update mailbox daily count
      availableMailbox.dailySent += 1;
      availableMailbox.lastSent = new Date();
      await availableMailbox.save();

    } else {
      // Update message with error
      message.status = 'failed';
      message.errorMessage = result.error;
      await message.save();

      // Update CampaignProspect with error
      campaignProspect.lastError = {
        message: result.error,
        timestamp: new Date(),
        code: 'SMTP_ERROR'
      };
      await campaignProspect.save();
    }
  }

  /**
   * Legacy method - kept for backward compatibility but updated to work with CampaignProspect
   */
  static async sendNextStep(campaign, prospectData) {
    await dbConnect();

    console.log(`=== SENDING NEXT STEP (Legacy) ===`);
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
      subject: currentStep.subject
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
    
    // Select mailbox - support both new and old campaign structures
    let mailboxes = [];
    
    // NEW STRUCTURE: campaign.options.selectedMailbox (single mailbox)
    if (campaign.options?.selectedMailbox) {
      const selectedMailbox = await (await import('../models/MailboxFixed.js')).default.findById(campaign.options.selectedMailbox);
      if (selectedMailbox) {
        mailboxes = [selectedMailbox];
        console.log(`Using selected mailbox from options: ${selectedMailbox.fromEmail}`);
      }
    }
    
    // OLD STRUCTURE: campaign.mailboxes (array of mailboxes)
    if (mailboxes.length === 0 && campaign.mailboxes && campaign.mailboxes.length > 0) {
      console.log(`Using mailboxes array: ${campaign.mailboxes.length} mailboxes`);
      mailboxes = campaign.mailboxes;
    }
    
    if (mailboxes.length === 0) {
      console.log('No mailboxes found in campaign');
      return;
    }
    
    console.log(`Campaign has ${mailboxes.length} mailbox(es)`);
    const availableMailbox = await this.selectAvailableMailbox(mailboxes);
    if (!availableMailbox) {
      console.log('No available mailbox found');
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

      if (!nextStep) {
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
    }
  }

  /**
   * Send email to a specific CampaignProspect
   */
  static async sendToProspect(campaignProspect) {
    const campaign = campaignProspect.campaign;
    const prospect = campaignProspect.prospect;

    if (!campaign || !prospect) {
      console.error('Missing campaign or prospect data');
      return;
    }

    console.log(`Sending step ${campaignProspect.sequenceStep} to ${prospect.email}`);

    // Get the sequence step
    const step = campaign.sequence.find(s => s.stepNumber === campaignProspect.sequenceStep);
    if (!step) {
      console.error(`Step ${campaignProspect.sequenceStep} not found in campaign ${campaign.name}`);
      return;
    }

    // Find available mailbox
    const availableMailbox = await this.findAvailableMailbox(campaign);
    if (!availableMailbox) {
      console.log(`No available mailbox for campaign ${campaign.name}`);
      return;
    }

    // Create message record
    const Message = (await import('../models/Message.js')).default;
    const trackingId = `track_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

    const message = new Message({
      campaignId: campaign._id,
      prospectId: prospect._id,
      mailboxId: availableMailbox._id,
      stepNumber: campaignProspect.sequenceStep,
      subject: this.personalizeContent(step.subject, prospect, campaign),
      content: this.personalizeContent(step.template, prospect, campaign),
      status: 'queued',
      trackingId,
      headerMessageId: `<${trackingId}@${availableMailbox.domain}>`,
      createdAt: new Date()
    });

    // Add tracking pixel
    const trackingPixel = `<img src="${process.env.NEXT_PUBLIC_APP_URL}/api/track/open/${trackingId}" width="1" height="1" style="display:none;">`;
    const personalizedContent = message.content + trackingPixel;

    // Send email
    const result = await SMTPService.sendEmail({
      mailbox: availableMailbox,
      to: prospect.email,
      subject: message.subject,
      html: personalizedContent,
      text: this.htmlToText(personalizedContent),
      trackingId: trackingId,
      messageId: message._id.toString(),
      headerMessageId: message.headerMessageId
    });

    if (result.success) {
      // Update message
      message.status = 'sent';
      message.sesMessageId = result.messageId;
      message.sentAt = new Date();
      await message.save();

      // Update campaign prospect
      await campaignProspect.recordEmailSent();

      // Schedule next step if exists
      const nextStep = campaign.sequence.find(s => s.stepNumber === campaignProspect.sequenceStep + 1);
      if (nextStep) {
        const delayMinutes = (nextStep.waitMinutes || 0);
        const delayHours = (nextStep.waitHours || 0);
        const delayDays = (nextStep.waitDays || 0);

        // Get campaign timezone for proper scheduling
        const campaignTimezone = campaign.scheduling?.timezone || campaign.options?.timezone || 'UTC';

        await campaignProspect.scheduleNextStep(delayMinutes, delayHours, delayDays, campaignTimezone);
        campaignProspect.sequenceStep += 1;
      } else {
        // Mark as completed
        await campaignProspect.markAsCompleted();
        
        // Check if campaign should be completed
        await this.checkCampaignCompletion(campaign._id);
      }

      await campaignProspect.save();

      // Update mailbox daily count
      availableMailbox.dailySent += 1;
      availableMailbox.lastSent = new Date();
      await availableMailbox.save();

      console.log(`✅ Sent step ${campaignProspect.sequenceStep} to ${prospect.email}`);

    } else {
      // Update message with error
      message.status = 'failed';
      message.errorMessage = result.error;
      await message.save();

      console.error(`❌ Failed to send to ${prospect.email}: ${result.error}`);
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

  /**
   * Find available mailbox for a campaign
   */
  static async findAvailableMailbox(campaign) {
    let mailboxes = [];

    // NEW STRUCTURE: campaign.options.selectedMailbox (single mailbox)
    if (campaign.options?.selectedMailbox) {
      const selectedMailbox = await (await import('../models/MailboxFixed.js')).default.findById(campaign.options.selectedMailbox);
      if (selectedMailbox) {
        mailboxes = [selectedMailbox];
      }
    }

    // OLD STRUCTURE: campaign.mailboxes (array of mailboxes)
    if (mailboxes.length === 0 && campaign.mailboxes && campaign.mailboxes.length > 0) {
      mailboxes = campaign.mailboxes;
    }

    if (mailboxes.length === 0) {
      return null;
    }

    return await this.selectAvailableMailbox(mailboxes);
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

    // Replace variables (case-insensitive and multiple formats)
    content = content.replace(/\{\{first_name\}\}/gi, prospect.firstName || '');
    content = content.replace(/\{\{firstName\}\}/gi, prospect.firstName || '');
    content = content.replace(/\{\{last_name\}\}/gi, prospect.lastName || '');
    content = content.replace(/\{\{lastName\}\}/gi, prospect.lastName || '');
    content = content.replace(/\{\{company\}\}/gi, prospect.company || '');
    content = content.replace(/\{\{city\}\}/gi, prospect.city || '');
    content = content.replace(/\{\{neighborhood\}\}/gi, prospect.neighborhood || '');
    content = content.replace(/\{\{listing_price\}\}/gi, prospect.listingPrice || '');
    content = content.replace(/\{\{listingPrice\}\}/gi, prospect.listingPrice || '');
    content = content.replace(/\{\{campaign_name\}\}/gi, campaign.name || '');
    content = content.replace(/\{\{campaignName\}\}/gi, campaign.name || '');
    
    // Add custom fields
    if (prospect.customFields && Array.isArray(prospect.customFields)) {
      for (const customField of prospect.customFields) {
        if (customField.name && customField.value !== undefined) {
          const regex = new RegExp(`\\{\\{${customField.name}\\}\\}`, 'g');
          content = content.replace(regex, customField.value);
        }
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





  /**
   * Normalize timezone string to valid IANA identifier
   */
  static normalizeTimezone(timezoneStr) {
    if (!timezoneStr) return 'America/New_York';
    
    // Mapping of common timezone formats to IANA identifiers
    const timezoneMap = {
      'Eastern Time (US & Canada) (UTC-04:00)': 'America/New_York',
      'Eastern Time (US & Canada) (UTC-05:00)': 'America/New_York',
      'Central Time (US & Canada) (UTC-05:00)': 'America/Chicago',
      'Central Time (US & Canada) (UTC-06:00)': 'America/Chicago',
      'Mountain Time (US & Canada) (UTC-06:00)': 'America/Denver',
      'Mountain Time (US & Canada) (UTC-07:00)': 'America/Denver',
      'Pacific Time (US & Canada) (UTC-07:00)': 'America/Los_Angeles',
      'Pacific Time (US & Canada) (UTC-08:00)': 'America/Los_Angeles',
      'India Standard Time': 'Asia/Kolkata',
      'Indian Standard Time': 'Asia/Kolkata',
      'IST': 'Asia/Kolkata',
      'UTC': 'UTC'
    };
    
    // Check if it's already a valid IANA identifier
    if (timezoneStr.includes('/') || timezoneStr === 'UTC') {
      return timezoneStr;
    }
    
    // Map common formats
    return timezoneMap[timezoneStr] || 'America/New_York';
  }

  static htmlToText(html) {
    return html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .trim();
  }

  /**
   * Check if all prospects in a campaign are completed and update campaign status
   * @param {string} campaignId - Campaign ID to check
   */
  static async checkCampaignCompletion(campaignId) {
    try {
      await dbConnect();

      // Get total prospect count for this campaign
      const totalProspects = await CampaignProspect.countDocuments({
        campaign: campaignId
      });

      if (totalProspects === 0) {
        console.log(`Campaign ${campaignId} has no prospects, skipping completion check`);
        return;
      }

      // Get count of non-completed prospects (pending, active, paused)
      const activeProspects = await CampaignProspect.countDocuments({
        campaign: campaignId,
        status: { $in: ['pending', 'active', 'paused'] }
      });

      console.log(`Campaign ${campaignId}: ${totalProspects} total prospects, ${activeProspects} still active`);

      // If no active prospects remain, mark campaign as completed
      if (activeProspects === 0) {
        const campaign = await Campaign.findById(campaignId);
        if (!campaign) {
          console.error(`Campaign ${campaignId} not found during completion check`);
          return;
        }

        // Only complete if currently active (don't override manual status changes)
        if (campaign.status === 'active') {
          const previousStatus = campaign.status;
          
          campaign.status = 'completed';
          campaign.completedAt = new Date();
          await campaign.save();

          console.log(`✅ Campaign "${campaign.name}" (${campaignId}) marked as completed - all prospects finished`);

          // Send completion notification
          try {
            await CampaignNotificationService.notifyCampaignStatusChange(
              campaign,
              previousStatus
            );
            
            // Send completion event notification
            await CampaignNotificationService.notifySchedulingEvent(
              campaign,
              'completed',
              {
                totalProspects,
                completedAt: campaign.completedAt
              }
            );
          } catch (notificationError) {
            console.error('Failed to send completion notifications:', notificationError);
            // Don't fail the completion process due to notification issues
          }
        } else {
          console.log(`Campaign ${campaignId} status is "${campaign.status}", not marking as completed`);
        }
      }

    } catch (error) {
      console.error(`Error checking campaign completion for ${campaignId}:`, error);
    }
  }

}
