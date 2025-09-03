import dbConnect from './mongodb.js';
import Campaign from '../models/Campaign.js';

/**
 * Campaign Execution Engine
 * Integrates all campaign settings (followup, schedule, options) into execution logic
 */
export class CampaignExecutor {
  constructor(campaignId) {
    this.campaignId = campaignId;
    this.campaign = null;
  }

  async initialize() {
    await dbConnect();
    this.campaign = await Campaign.findById(this.campaignId)
      .populate('prospects.prospectId')
      .populate('options.selectedMailbox');
    
    if (!this.campaign) {
      throw new Error('Campaign not found');
    }
    
    return this;
  }

  /**
   * Check if campaign should send emails based on schedule settings
   */
  isWithinSchedule() {
    const schedule = this.campaign.schedule;
    if (!schedule) {
      console.log('No schedule found, allowing sending');
      return true;
    }

    // Get campaign timezone from schedule or options
    console.log('=== TIMEZONE SOURCE DEBUG ===');
    console.log('schedule.timing?.timezone:', schedule.timing?.timezone);
    console.log('this.campaign.options?.timezone:', this.campaign.options?.timezone);
    
    const campaignTimezone = this.campaign.options?.timezone || schedule.timing?.timezone || 'America/New_York';
    console.log(`Final campaignTimezone resolved to: ${campaignTimezone}`);
    console.log('=== END TIMEZONE SOURCE DEBUG ===');

    // Convert current time to campaign timezone
    const now = new Date();
    const campaignTime = new Date(now.toLocaleString("en-US", {timeZone: this.getTimezoneId(campaignTimezone)}));
    
    const currentDay = campaignTime.toLocaleDateString('en-US', { weekday: 'long', timeZone: this.getTimezoneId(campaignTimezone) }).toLowerCase();
    const currentHour = campaignTime.getHours();

    console.log(`Server time: ${now}`);
    console.log(`Campaign time (${campaignTimezone}): ${campaignTime}`);
    console.log(`Schedule check - Day: ${currentDay}, Hour: ${currentHour}`);
    console.log(`Schedule days:`, schedule.days);
    console.log(`Schedule timing: ${schedule.timing?.from} - ${schedule.timing?.to}`);

    // Check if today is enabled
    if (!schedule.days || !schedule.days[currentDay]) {
      console.log(`Day ${currentDay} not enabled in schedule`);
      return false;
    }

    // Check time window
    const fromHour = this.parseTimeToHour(schedule.timing?.from || '9:00 AM');
    const toHour = this.parseTimeToHour(schedule.timing?.to || '6:00 PM');
    
    console.log(`Time window: ${fromHour}:00 - ${toHour}:00, Current: ${currentHour}:00`);
    
    if (currentHour < fromHour || currentHour >= toHour) {
      console.log(`Outside time window: ${currentHour} not between ${fromHour} and ${toHour}`);
      return false;
    }

    console.log('Within schedule window');
    return true;
  }

  /**
   * Convert timezone display name to timezone ID
   */
  getTimezoneId(timezoneDisplay) {
    const timezoneMap = {
      'Eastern Time (US & Canada) (UTC-04:00)': 'America/New_York',
      'Eastern Time (US & Canada) (UTC-05:00)': 'America/New_York',
      'Central Time (US & Canada) (UTC-05:00)': 'America/Chicago',
      'Central Time (US & Canada) (UTC-06:00)': 'America/Chicago',
      'Mountain Time (US & Canada) (UTC-06:00)': 'America/Denver',
      'Mountain Time (US & Canada) (UTC-07:00)': 'America/Denver',
      'Pacific Time (US & Canada) (UTC-07:00)': 'America/Los_Angeles',
      'Pacific Time (US & Canada) (UTC-08:00)': 'America/Los_Angeles',
      'Asia/Kolkata': 'Asia/Kolkata',
      'Asia/Tokyo': 'Asia/Tokyo',
      'Japan Standard Time (UTC+09:00)': 'Asia/Tokyo',
      'UTC': 'UTC'
    };
    
    return timezoneMap[timezoneDisplay] || 'America/New_York';
  }

  /**
   * Get prospects ready for next step based on all settings
   */
  async getProspectsReadyForSending() {
    const now = new Date();
    console.log(`Checking schedule - Current time: ${now}`);
    console.log(`Schedule check result: ${this.isWithinSchedule()}`);
    
    if (!this.isWithinSchedule()) {
      console.log('Outside schedule window, skipping email sending');
      return [];
    }

    const dailyLimit = this.campaign.options?.dailyLimit || this.campaign.settings?.dailyLimit || 50;
    console.log(`Daily limit: ${dailyLimit}`);
    
    // Get prospects ready for sending
    const allProspects = this.campaign.prospects || [];
    console.log(`Total prospects in campaign: ${allProspects.length}`);
    
    const readyProspects = allProspects.filter(cp => {
      const isActive = cp.status === 'active';
      const hasNextSend = cp.nextSendAt;
      const isTimeToSend = hasNextSend && new Date(cp.nextSendAt) <= now;
      
      console.log(`Prospect ${cp.prospectId?.email || 'Unknown'}: active=${isActive}, nextSend=${cp.nextSendAt}, timeToSend=${isTimeToSend}`);
      
      return isActive && hasNextSend && isTimeToSend;
    });

    console.log(`Found ${readyProspects.length} prospects ready for sending`);
    
    // Apply daily limit
    const limitedProspects = readyProspects.slice(0, dailyLimit);
    console.log(`After daily limit: ${limitedProspects.length} prospects`);
    
    return limitedProspects;
  }

  /**
   * Get prospects ready for follow-up based on follow-up settings
   */
  async getProspectsReadyForFollowUp() {
    const followUpSettings = this.campaign.followUpSettings;
    if (!followUpSettings?.enabled) {
      return [];
    }

    if (!this.isWithinSchedule()) {
      return [];
    }

    const now = new Date();
    const readyForFollowUp = [];

    for (const cp of this.campaign.prospects) {
      if (cp.status !== 'active') continue;

      // Check if prospect has completed main sequence
      const maxStep = this.campaign.sequence?.length || 0;
      if (cp.currentStep <= maxStep) continue;

      // Check follow-up conditions
      const shouldSendFollowUp = await this.shouldSendFollowUp(cp, followUpSettings);
      if (shouldSendFollowUp) {
        readyForFollowUp.push(cp);
      }
    }

    return readyForFollowUp;
  }

  /**
   * Determine if a prospect should receive a follow-up
   */
  async shouldSendFollowUp(campaignProspect, followUpSettings) {
    const conditions = followUpSettings.conditions;
    
    // Check if prospect has reached max follow-ups
    const followUpCount = campaignProspect.followUpCount || 0;
    if (followUpCount >= followUpSettings.maxFollowUps) {
      return false;
    }

    // Check timing
    const lastSent = campaignProspect.lastSentAt;
    if (!lastSent) return false;

    const daysSinceLastSent = (Date.now() - new Date(lastSent).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceLastSent < followUpSettings.followUpDelay) {
      return false;
    }

    // Check engagement conditions
    const prospect = campaignProspect.prospectId;
    
    // If no reply condition is enabled and prospect hasn't replied
    if (conditions.noReply && !prospect.hasReplied) {
      return true;
    }

    // If no open condition is enabled and prospect hasn't opened
    if (conditions.noOpen && !prospect.hasOpened) {
      return true;
    }

    // If bounced condition is enabled and last email bounced
    if (conditions.bounced && prospect.lastEmailBounced) {
      return true;
    }

    return false;
  }

  /**
   * Process campaign execution with all integrated settings
   */
  async processCampaign() {
    const results = {
      sent: 0,
      followUpsSent: 0,
      errors: [],
      skipped: 0
    };

    console.log(`Processing campaign: ${this.campaign.name} (ID: ${this.campaign._id})`);
    console.log(`Campaign status: ${this.campaign.status}`);
    console.log(`Total prospects: ${this.campaign.prospects?.length || 0}`);

    try {
      // Process main sequence
      const readyProspects = await this.getProspectsReadyForSending();
      console.log(`Found ${readyProspects.length} prospects ready for sending`);
      
      for (const cp of readyProspects) {
        console.log(`Processing prospect: ${cp.prospectId?.email || 'Unknown'} - Step ${cp.currentStep}`);
        try {
          await this.sendSequenceEmail(cp);
          results.sent++;
        } catch (error) {
          console.error(`Error sending to prospect ${cp.prospectId?._id}:`, error);
          results.errors.push(`Prospect ${cp.prospectId?._id}: ${error.message}`);
        }
      }

      // Process follow-ups
      const followUpProspects = await this.getProspectsReadyForFollowUp();
      for (const cp of followUpProspects) {
        try {
          await this.sendFollowUpEmail(cp);
          results.followUpsSent++;
        } catch (error) {
          results.errors.push(`Follow-up ${cp.prospectId._id}: ${error.message}`);
        }
      }

      // Update campaign stats
      await this.updateCampaignStats(results);

    } catch (error) {
      results.errors.push(`Campaign execution error: ${error.message}`);
    }

    return results;
  }

  /**
   * Send sequence email using campaign options
   */
  async sendSequenceEmail(campaignProspect) {
    const step = this.campaign.sequence[campaignProspect.currentStep - 1];
    if (!step) {
      throw new Error('Sequence step not found');
    }

    const mailbox = this.campaign.options?.selectedMailbox;
    if (!mailbox) {
      throw new Error('No mailbox configured');
    }

    // Use campaign options for tracking
    const trackingOptions = {
      trackOpens: this.campaign.options?.trackOpens ?? true,
      trackClicks: this.campaign.options?.trackClicks ?? true,
      unsubscribeLink: this.campaign.options?.unsubscribeLink ?? true
    };

    // Send email using SMTP service
    console.log(`Sending email to ${campaignProspect.prospectId.email} - Step ${campaignProspect.currentStep}`);
    console.log(`Subject: ${step.subject}`);
    console.log(`Template: ${step.template}`);
    
    // Import SMTPService dynamically to avoid circular imports
    const { SMTPService } = await import('./smtp.js');
    const { v4: uuidv4 } = await import('uuid');
    
    const trackingId = uuidv4();
    const messageId = `${trackingId}@${mailbox.domain}`;
    
    // Dynamic variable replacement function
    const replaceVariables = (text, prospect) => {
      if (!text) return text;
      
      let result = text;
      
      // Replace all prospect fields dynamically
      Object.keys(prospect).forEach(key => {
        const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
        result = result.replace(regex, prospect[key] || '');
      });
      
      // Handle common fallbacks
      result = result.replace(/\{\{firstName\}\}/g, prospect.firstName || 'there');
      
      return result;
    };
    
    // Personalize both template and subject
    const personalizedTemplate = replaceVariables(step.template, campaignProspect.prospectId);
    const personalizedSubject = replaceVariables(step.subject, campaignProspect.prospectId);
    
    // Send actual email
    const emailResult = await SMTPService.sendEmail({
      mailbox: mailbox,
      to: campaignProspect.prospectId.email,
      subject: personalizedSubject,
      html: personalizedTemplate.replace(/\n/g, '<br>'),
      text: personalizedTemplate,
      trackingId: trackingId,
      messageId: messageId
    });
    
    console.log(`Email send result:`, emailResult);
    
    if (!emailResult.success) {
      throw new Error(`Failed to send email: ${emailResult.error}`);
    }

    // Create message record for tracking
    const { default: Message } = await import('../models/Message.js');
    
    const messageRecord = new Message({
      campaignId: this.campaign._id,
      prospectId: campaignProspect.prospectId._id,
      mailboxId: mailbox._id,
      subject: personalizedSubject,
      content: personalizedTemplate,
      trackingId: trackingId,
      messageId: messageId,
      status: 'sent',
      sentAt: new Date(),
      stepNumber: campaignProspect.currentStep
    });
    
    await messageRecord.save();
    console.log(`Message record created with ID: ${messageRecord._id}`);
    
    // Update prospect status
    campaignProspect.currentStep++;
    campaignProspect.lastSentAt = new Date();
    
    // Schedule next step based on sequence settings
    if (campaignProspect.currentStep <= this.campaign.sequence.length) {
      const nextStep = this.campaign.sequence[campaignProspect.currentStep - 1];
      const nextSendDate = new Date();
      
      // Add wait time in hours and minutes
      const waitHours = parseInt(nextStep.waitHours) || 0;
      const waitMinutes = parseInt(nextStep.waitMinutes) || 0;
      
      console.log(`Next step wait time: ${waitHours} hours, ${waitMinutes} minutes`);
      
      nextSendDate.setHours(nextSendDate.getHours() + waitHours);
      nextSendDate.setMinutes(nextSendDate.getMinutes() + waitMinutes);
      
      campaignProspect.nextSendAt = nextSendDate;
      console.log(`Next email scheduled for: ${nextSendDate}`);
    } else {
      campaignProspect.nextSendAt = null;
    }

    await this.campaign.save();
  }

  /**
   * Send follow-up email using follow-up templates
   */
  async sendFollowUpEmail(campaignProspect) {
    const followUpSettings = this.campaign.followUpSettings;
    const followUpCount = campaignProspect.followUpCount || 0;
    
    const template = followUpSettings.followUpTemplates[followUpCount];
    if (!template) {
      throw new Error('Follow-up template not found');
    }

    // Send follow-up email logic would go here
    
    // Update prospect follow-up status
    campaignProspect.followUpCount = followUpCount + 1;
    campaignProspect.lastFollowUpSentAt = new Date();
    
    // Schedule next follow-up if not at max
    if (campaignProspect.followUpCount < followUpSettings.maxFollowUps) {
      const nextFollowUpDate = new Date();
      nextFollowUpDate.setDate(nextFollowUpDate.getDate() + followUpSettings.followUpDelay);
      campaignProspect.nextFollowUpAt = nextFollowUpDate;
    }

    await this.campaign.save();
  }

  /**
   * Update campaign statistics
   */
  async updateCampaignStats(results) {
    this.campaign.stats.sent += results.sent + results.followUpsSent;
    this.campaign.updatedAt = new Date();
    await this.campaign.save();
  }

  /**
   * Helper to parse time string to hour
   */
  parseTimeToHour(timeString) {
    const [time, period] = timeString.split(' ');
    let [hours] = time.split(':').map(Number);
    
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    
    return hours;
  }
}

/**
 * Process all active campaigns
 */
export async function processAllCampaigns() {
  await dbConnect();
  
  const activeCampaigns = await Campaign.find({ status: 'active' });
  const results = [];

  for (const campaign of activeCampaigns) {
    try {
      const executor = new CampaignExecutor(campaign._id);
      await executor.initialize();
      const result = await executor.processCampaign();
      
      results.push({
        campaignId: campaign._id,
        campaignName: campaign.name,
        ...result
      });
    } catch (error) {
      results.push({
        campaignId: campaign._id,
        campaignName: campaign.name,
        error: error.message
      });
    }
  }

  return results;
}
