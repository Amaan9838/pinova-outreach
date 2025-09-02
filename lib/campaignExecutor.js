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
    if (!schedule) return true;

    const now = new Date();
    const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const currentHour = now.getHours();

    // Check if today is enabled
    if (!schedule.days[currentDay]) {
      return false;
    }

    // Check time window
    const fromHour = this.parseTimeToHour(schedule.timing.from);
    const toHour = this.parseTimeToHour(schedule.timing.to);
    
    if (currentHour < fromHour || currentHour >= toHour) {
      return false;
    }

    return true;
  }

  /**
   * Get prospects ready for next step based on all settings
   */
  async getProspectsReadyForSending() {
    if (!this.isWithinSchedule()) {
      return [];
    }

    const now = new Date();
    const dailyLimit = this.campaign.options?.dailyLimit || this.campaign.settings?.dailyLimit || 50;
    
    // Get prospects ready for sending
    const readyProspects = this.campaign.prospects.filter(cp => {
      return cp.status === 'active' && 
             cp.nextSendAt && 
             new Date(cp.nextSendAt) <= now;
    });

    // Apply daily limit
    return readyProspects.slice(0, dailyLimit);
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

    try {
      // Process main sequence
      const readyProspects = await this.getProspectsReadyForSending();
      for (const cp of readyProspects) {
        try {
          await this.sendSequenceEmail(cp);
          results.sent++;
        } catch (error) {
          results.errors.push(`Prospect ${cp.prospectId._id}: ${error.message}`);
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

    // Send email logic would go here
    // This is a placeholder for the actual email sending implementation
    
    // Update prospect status
    campaignProspect.currentStep++;
    campaignProspect.lastSentAt = new Date();
    
    // Schedule next step based on sequence settings
    if (campaignProspect.currentStep <= this.campaign.sequence.length) {
      const nextStep = this.campaign.sequence[campaignProspect.currentStep - 1];
      const nextSendDate = new Date();
      nextSendDate.setHours(nextSendDate.getHours() + (nextStep.waitHours || 24));
      campaignProspect.nextSendAt = nextSendDate;
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
