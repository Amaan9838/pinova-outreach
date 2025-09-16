import dbConnect from './mongodb.js';
import Campaign from '../models/Campaign.js';
import CampaignProspect from '../models/CampaignProspect.js';
import Message from '../models/Message.js';
import Prospect from '../models/Prospect.js';
import { SMTPService } from './smtp.js';

/**
 * UNIFIED FOLLOW-UP SYSTEM
 * 
 * This service consolidates the three conflicting follow-up systems:
 * 1. Sequence-based follow-ups (built into Campaign.sequence)
 * 2. Campaign follow-up settings (Campaign.followUpSettings)
 * 3. Separate SMTP cron follow-ups (process-followups route)
 * 
 * The unified system provides:
 * - Consistent stop conditions across all follow-up types
 * - Single source of truth for follow-up logic
 * - Prevention of duplicate follow-ups
 * - Integration with all scheduling systems
 */
export class UnifiedFollowupService {
  
  /**
   * Process all follow-ups across all active campaigns
   * This replaces the separate process-followups cron job
   */
  static async processAllFollowups() {
    await dbConnect();
    
    console.log('=== PROCESSING UNIFIED FOLLOW-UPS ===');
    
    // Find campaigns with follow-up settings enabled
    const campaignsWithFollowups = await Campaign.find({
      status: 'active',
      'followUpSettings.enabled': true
    });
    
    console.log(`Found ${campaignsWithFollowups.length} campaigns with follow-ups enabled`);
    
    let totalProcessed = 0;
    
    for (const campaign of campaignsWithFollowups) {
      try {
        const processed = await this.processCampaignFollowups(campaign);
        totalProcessed += processed;
      } catch (error) {
        console.error(`Error processing follow-ups for campaign ${campaign._id}:`, error);
      }
    }
    
    console.log(`=== FOLLOW-UP PROCESSING COMPLETE: ${totalProcessed} processed ===`);
    return { processedCount: totalProcessed };
  }
  
  /**
   * Process follow-ups for a specific campaign
   */
  static async processCampaignFollowups(campaign) {
    console.log(`Processing follow-ups for campaign: ${campaign.name}`);
    
    const now = new Date();
    let processedCount = 0;
    
    // Get all messages that need follow-ups
    const candidateMessages = await Message.find({
      campaignId: campaign._id,
      status: { $in: ['sent', 'delivered', 'opened'] },
      followUpAt: { $lte: now },
      followUpSent: { $ne: true }
    }).populate('prospectId');
    
    console.log(`Found ${candidateMessages.length} candidate messages for follow-up`);
    
    for (const message of candidateMessages) {
      try {
        const processed = await this.processMessageFollowup(campaign, message);
        if (processed) processedCount++;
      } catch (error) {
        console.error(`Error processing follow-up for message ${message._id}:`, error);
      }
    }
    
    return processedCount;
  }
  
  /**
   * Process follow-up for a specific message with unified stop conditions
   */
  static async processMessageFollowup(campaign, message) {
    const prospect = message.prospectId;
    if (!prospect) return false;
    
    console.log(`Processing follow-up for prospect: ${prospect.email}`);
    
    // UNIFIED STOP CONDITIONS - check all systems
    const shouldStop = await this.shouldStopFollowup(campaign, message, prospect);
    if (shouldStop.stop) {
      console.log(`Follow-up stopped: ${shouldStop.reason}`);
      await this.markFollowupComplete(message, shouldStop.reason);
      return false;
    }
    
    // Check follow-up limits
    const existingFollowups = await Message.countDocuments({
      campaignId: campaign._id,
      prospectId: prospect._id,
      type: 'followup'
    });
    
    const maxFollowups = campaign.followUpSettings?.maxFollowUps || 3;
    if (existingFollowups >= maxFollowups) {
      console.log(`Max follow-ups reached: ${existingFollowups}/${maxFollowups}`);
      await this.markFollowupComplete(message, 'Max follow-ups reached');
      return false;
    }
    
    // Send follow-up email
    return await this.sendFollowupEmail(campaign, message, prospect, existingFollowups);
  }
  
  /**
   * CRITICAL: Unified stop conditions that check ALL systems
   * This prevents the conflicting logic between sequence conditions and follow-up settings
   */
  static async shouldStopFollowup(campaign, message, prospect) {
    // 1. Check if prospect has replied (from inbox monitor)
    if (prospect.status === 'replied') {
      return { stop: true, reason: 'Prospect replied' };
    }
    
    // 2. Check campaign prospect status using CampaignProspect model
    const campaignProspect = await CampaignProspect.findOne({
      campaign: campaign._id,
      prospect: prospect._id
    });

    if (campaignProspect?.status === 'completed') {
      return { stop: true, reason: 'Campaign prospect completed' };
    }

    if (campaignProspect?.status === 'stopped') {
      return { stop: true, reason: 'Campaign prospect stopped' };
    }

    if (campaignProspect?.status === 'replied') {
      return { stop: true, reason: 'Campaign prospect replied' };
    }
    
    // 3. Check message-level reply events
    const hasReplied = message.events?.some(event => event.type === 'replied');
    if (hasReplied) {
      return { stop: true, reason: 'Message has reply event' };
    }
    
    // 4. Check follow-up settings stop conditions
    const followUpSettings = campaign.followUpSettings || {};
    
    if (followUpSettings.stopOnReply && hasReplied) {
      return { stop: true, reason: 'Stop on reply enabled and prospect replied' };
    }
    
    if (followUpSettings.stopOnOpen) {
      const hasOpened = message.events?.some(event => event.type === 'opened');
      if (hasOpened) {
        return { stop: true, reason: 'Stop on open enabled and message opened' };
      }
    }
    
    // 5. Check sequence-based stop conditions (if this is part of a sequence)
    if (message.stepNumber && campaign.sequence?.length > 0) {
      const sequenceStep = campaign.sequence.find(step => step.stepNumber === message.stepNumber);
      if (sequenceStep?.conditions?.ifReplied === 'stop' && hasReplied) {
        return { stop: true, reason: 'Sequence condition: stop if replied' };
      }
    }
    
    // 6. Check if prospect is suppressed
    const suppressed = await this.isProspectSuppressed(prospect.email);
    if (suppressed) {
      return { stop: true, reason: 'Prospect email is suppressed' };
    }
    
    return { stop: false, reason: 'Continue follow-up' };
  }
  
  /**
   * Send follow-up email with proper template selection
   */
  static async sendFollowupEmail(campaign, originalMessage, prospect, followupNumber) {
    console.log(`Sending follow-up #${followupNumber + 1} to ${prospect.email}`);
    
    // Get follow-up template
    const followUpTemplates = campaign.followUpSettings?.followUpTemplates || [];
    if (followUpTemplates.length === 0) {
      console.log('No follow-up templates configured');
      await this.markFollowupComplete(originalMessage, 'No templates configured');
      return false;
    }
    
    // Select appropriate template (use last template if we exceed available templates)
    const templateIndex = Math.min(followupNumber, followUpTemplates.length - 1);
    const template = followUpTemplates[templateIndex];
    
    if (!template) {
      console.log('No template found for follow-up number', followupNumber + 1);
      await this.markFollowupComplete(originalMessage, 'No template available');
      return false;
    }
    
    // Personalize content
    const personalizedSubject = this.personalizeContent(
      template.subject || `Re: ${originalMessage.subject}`,
      prospect,
      campaign
    );
    
    const personalizedContent = this.personalizeContent(
      template.content || '',
      prospect,
      campaign
    );
    
    // Get mailbox for sending
    const mailbox = await this.getMailboxForCampaign(campaign);
    if (!mailbox) {
      console.log('No mailbox available for sending follow-up');
      return false;
    }
    
    try {
      // Create follow-up message record
      const followupMessage = new Message({
        campaignId: campaign._id,
        prospectId: prospect._id,
        mailboxId: mailbox._id,
        originalMessageId: originalMessage._id,
        stepNumber: originalMessage.stepNumber,
        subject: personalizedSubject,
        content: personalizedContent,
        status: 'queued',
        type: 'followup',
        scheduledAt: new Date()
      });
      
      await followupMessage.save();
      
      // Send via SMTP
      const result = await SMTPService.sendEmail({
        mailbox: mailbox,
        to: prospect.email,
        subject: personalizedSubject,
        html: personalizedContent,
        text: this.htmlToText(personalizedContent),
        messageId: followupMessage._id.toString(),
        headerMessageId: followupMessage.headerMessageId,
        // Set threading headers to maintain conversation
        inReplyTo: originalMessage.headerMessageId,
        references: [originalMessage.headerMessageId]
      });
      
      if (result.success) {
        // Update follow-up message status
        followupMessage.status = 'sent';
        followupMessage.sentAt = new Date();
        followupMessage.events = [{
          type: 'sent',
          timestamp: new Date()
        }];
        await followupMessage.save();
        
        // Mark follow-up complete (scheduling removed)
        await this.markFollowupComplete(originalMessage, 'Follow-up sent');
        
        console.log(`Follow-up sent successfully to ${prospect.email}`);
        return true;
        
      } else {
        console.error(`Failed to send follow-up: ${result.error}`);
        followupMessage.status = 'failed';
        followupMessage.errorMessage = result.error;
        await followupMessage.save();
        return false;
      }
      
    } catch (error) {
      console.error('Error sending follow-up email:', error);
      return false;
    }
  }
  
  /**
   * Mark follow-up as complete
   */
  static async markFollowupComplete(message, reason) {
    message.followUpSent = true;
    message.followUpCompletedReason = reason;
    message.followUpCompletedAt = new Date();
    await message.save();
    console.log(`Follow-up marked complete: ${reason}`);
  }
  
  /**
   * Get mailbox for campaign (handles all mailbox reference systems)
   */
  static async getMailboxForCampaign(campaign) {
    const Mailbox = (await import('../models/MailboxFixed.js')).default;
    
    // Try new single mailbox reference first
    if (campaign.options?.selectedMailbox) {
      const mailbox = await Mailbox.findById(campaign.options.selectedMailbox);
      if (mailbox && mailbox.status === 'active') {
        return mailbox;
      }
    }
    
    // Try legacy single mailbox reference
    if (campaign.mailbox) {
      const mailbox = await Mailbox.findById(campaign.mailbox);
      if (mailbox && mailbox.status === 'active') {
        return mailbox;
      }
    }
    
    // Try mailbox array (select first active one)
    if (campaign.mailboxes && campaign.mailboxes.length > 0) {
      for (const mailboxId of campaign.mailboxes) {
        const mailbox = await Mailbox.findById(mailboxId);
        if (mailbox && mailbox.status === 'active') {
          return mailbox;
        }
      }
    }
    
    return null;
  }
  
  /**
   * Check if prospect email is suppressed
   */
  static async isProspectSuppressed(email) {
    const Suppression = (await import('../models/Suppression.js')).default;
    const suppression = await Suppression.findOne({ email: email.toLowerCase() });
    return !!suppression;
  }
  
  /**
   * Personalize content with prospect variables
   */
  static personalizeContent(template, prospect, campaign) {
    let content = template;
    
    // Replace variables
    const variables = {
      firstName: prospect.firstName || '',
      lastName: prospect.lastName || '',
      email: prospect.email || '',
      company: prospect.company || '',
      phone: prospect.phone || '',
      website: prospect.website || '',
      industry: prospect.industry || '',
      position: prospect.position || '',
      city: prospect.city || '',
      neighborhood: prospect.neighborhood || '',
      listingPrice: prospect.listingPrice || '',
      campaignName: campaign.name || ''
    };
    
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      content = content.replace(regex, value);
    });
    
    // Handle custom fields if they exist
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
  
  /**
   * Convert HTML to plain text
   */
  static htmlToText(html) {
    return html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<[^>]*>/g, '')
      .trim();
  }
  
  /**
   * CRITICAL: Clean up conflicting follow-up systems
   * This method should be called during migration to remove duplicate follow-ups
   */
  static async cleanupConflictingFollowups(campaignId) {
    console.log(`Cleaning up conflicting follow-ups for campaign ${campaignId}`);
    
    // Find duplicate follow-up messages
    const duplicates = await Message.aggregate([
      {
        $match: {
          campaignId: mongoose.Types.ObjectId(campaignId),
          type: 'followup'
        }
      },
      {
        $group: {
          _id: {
            prospectId: '$prospectId',
            originalMessageId: '$originalMessageId',
            stepNumber: '$stepNumber'
          },
          messages: { $push: '$$ROOT' },
          count: { $sum: 1 }
        }
      },
      {
        $match: { count: { $gt: 1 } }
      }
    ]);
    
    let cleanedCount = 0;
    for (const duplicateGroup of duplicates) {
      // Keep the earliest message, remove the rest
      const messages = duplicateGroup.messages.sort((a, b) => a.createdAt - b.createdAt);
      const toRemove = messages.slice(1);
      
      for (const message of toRemove) {
        await Message.deleteOne({ _id: message._id });
        cleanedCount++;
      }
    }
    
    console.log(`Cleaned up ${cleanedCount} duplicate follow-up messages`);
    return cleanedCount;
  }
}
