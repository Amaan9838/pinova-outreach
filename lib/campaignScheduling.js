import dbConnect from './mongodb.js';
import Campaign from '../models/Campaign.js';
import CampaignProspect from '../models/CampaignProspect.js';
import { CampaignValidationService } from './campaignValidation.js';
import { CampaignNotificationService } from './campaignNotifications.js';

/**
 * Campaign Scheduling Service
 * 
 * Handles campaign scheduling logic, status transitions, and automatic retry mechanisms
 */
export class CampaignSchedulingService {
  
  /**
   * Schedule a campaign for future execution
   * @param {string} campaignId - Campaign ID
   * @param {Date} startDateTime - When to start the campaign
   * @param {Object} options - Scheduling options
   * @returns {Object} Scheduling result
   */
  static async scheduleCampaign(campaignId, startDateTime, options = {}) {
    await dbConnect();
    
    try {
      const campaign = await Campaign.findById(campaignId);
      if (!campaign) {
        return {
          success: false,
          error: 'Campaign not found'
        };
      }
      
      // Check if campaign can be scheduled
      if (!campaign.canBeScheduled()) {
        return {
          success: false,
          error: `Campaign cannot be scheduled from status: ${campaign.status}`
        };
      }
      
      // Validate start time
      if (new Date(startDateTime) <= new Date()) {
        return {
          success: false,
          error: 'Start time must be in the future'
        };
      }
      
      // Apply scheduling options
      if (options.timezone) {
        campaign.scheduling = campaign.scheduling || {};
        campaign.scheduling.timezone = options.timezone;
      }
      
      if (options.businessHours) {
        campaign.scheduling = campaign.scheduling || {};
        campaign.scheduling.businessHours = { ...campaign.scheduling.businessHours, ...options.businessHours };
      }
      
      if (options.staggerSettings) {
        campaign.scheduling = campaign.scheduling || {};
        campaign.scheduling.staggerSettings = { ...campaign.scheduling.staggerSettings, ...options.staggerSettings };
      }
      
      if (typeof options.autoActivateWhenReady === 'boolean') {
        campaign.scheduling = campaign.scheduling || {};
        campaign.scheduling.autoActivateWhenReady = options.autoActivateWhenReady;
      }
      
      // Validate campaign
      const validation = await CampaignValidationService.validateCampaign(campaignId);
      
      if (validation.valid) {
        // Mark as scheduled
        const previousStatus = campaign.status;
        await campaign.markAsScheduled(startDateTime, options.timezone);

        // CRITICAL FIX: Sync prospects with scheduled times when campaign is scheduled
        // This ensures prospects get their nextSendAt times set to the scheduled time + stagger
        const { CampaignProspectService } = await import('./services/CampaignProspectService.js');
        const syncResult = await CampaignProspectService.syncProspectsWithCampaignStatus(
          campaignId,
          'scheduled',
          {
            startDateTime: new Date(startDateTime),
            staggerSettings: campaign.scheduling?.staggerSettings || {}
          }
        );

        if (!syncResult.success) {
          console.error(`Failed to sync prospects during scheduling for campaign ${campaignId}:`, syncResult.error);
          // Continue anyway - can be fixed during activation
        } else {
          console.log(`Scheduled ${syncResult.modified} prospects for campaign ${campaignId} at ${startDateTime}`);
        }

        // Send notification
        await CampaignNotificationService.notifyCampaignStatusChange(
          campaign,
          previousStatus
        );

        await CampaignNotificationService.notifySchedulingEvent(
          campaign,
          'scheduled',
          { startDateTime, prospectsScheduled: syncResult.modified }
        );

        return {
          success: true,
          status: 'scheduled',
          message: 'Campaign scheduled successfully',
          startDateTime,
          campaign,
          prospectsScheduled: syncResult.modified
        };
      } else {
        // Mark as pending scheduled with validation errors
        const previousStatus = campaign.status;
        await campaign.markAsPendingScheduled(startDateTime, options.timezone, validation.errors);

        // Send notifications
        await CampaignNotificationService.notifyCampaignStatusChange(
          campaign,
          previousStatus
        );

        await CampaignNotificationService.notifyValidationFailure(
          campaign,
          validation.errors
        );

        return {
          success: true,
          status: 'pending_scheduled',
          message: 'Campaign scheduled but has validation issues',
          startDateTime,
          errors: validation.errors,
          campaign
        };
      }
      
    } catch (error) {
      console.error('Campaign scheduling error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Process scheduled campaigns that are ready to start
   * @returns {Object} Processing results
   */
  static async processScheduledCampaigns() {
    await dbConnect();
    
    try {
      const now = new Date();
      
      // Find campaigns ready to start
      const readyCampaigns = await Campaign.find({
        status: 'scheduled',
        'scheduling.startDateTime': { $lte: now }
      });
      
      console.log(`Found ${readyCampaigns.length} campaigns ready to start`);
      
      const results = {
        processed: 0,
        activated: 0,
        failed: 0,
        errors: []
      };
      
      for (const campaign of readyCampaigns) {
        results.processed++;
        
        try {
          const activationResult = await this.activateCampaign(campaign._id);
          
          if (activationResult.success) {
            results.activated++;
            console.log(`✅ Campaign ${campaign.name} activated successfully`);
          } else {
            results.failed++;
            results.errors.push({
              campaignId: campaign._id,
              campaignName: campaign.name,
              error: activationResult.error
            });
            console.log(`❌ Failed to activate campaign ${campaign.name}: ${activationResult.error}`);
          }
        } catch (error) {
          results.failed++;
          results.errors.push({
            campaignId: campaign._id,
            campaignName: campaign.name,
            error: error.message
          });
          console.error(`❌ Error processing campaign ${campaign.name}:`, error);
        }
      }
      
      return results;
      
    } catch (error) {
      console.error('Error processing scheduled campaigns:', error);
      return {
        processed: 0,
        activated: 0,
        failed: 0,
        errors: [{ error: error.message }]
      };
    }
  }
  
  /**
   * Activate a campaign (transition from scheduled to active)
   * @param {string} campaignId - Campaign ID
   * @returns {Object} Activation result
   */
  static async activateCampaign(campaignId) {
    try {
      // Re-validate campaign before activation with activation context
      // This allows past start times since we're activating a scheduled campaign
      const validation = await CampaignValidationService.validateCampaign(campaignId, { isActivation: true });
      
      if (!validation.valid) {
        // Move to failed status with retry logic
        const campaign = validation.campaign;
        campaign.status = 'failed';
        campaign.failedAt = new Date();
        
        // Set up retry if auto-activate is enabled
        if (campaign.scheduling?.autoActivateWhenReady) {
          const retryDelay = this.calculateRetryDelay(campaign.validation.retryCount);
          campaign.validation.retryCount += 1;
          campaign.validation.nextRetryAt = new Date(Date.now() + retryDelay);
        }
        
        await campaign.save();
        
        return {
          success: false,
          error: `Validation failed: ${validation.errors.map(e => e.message).join(', ')}`
        };
      }
      
      const campaign = validation.campaign;
      
      // Activate campaign
      campaign.status = 'active';
      campaign.startedAt = new Date();
      campaign.validation.retryCount = 0;
      campaign.validation.nextRetryAt = undefined;

      await campaign.save();

      // Sync prospects with campaign status (this replaces the old scheduleProspectsForCampaign call)
      const { CampaignProspectService } = await import('./services/CampaignProspectService.js');
      const syncResult = await CampaignProspectService.syncProspectsWithCampaignStatus(
        campaignId,
        'active',
        { staggerSettings: campaign.scheduling?.staggerSettings || {} }
      );

      if (!syncResult.success) {
        console.error(`Failed to sync prospects for campaign ${campaignId}:`, syncResult.error);
      }
      
      return {
        success: true,
        message: 'Campaign activated successfully',
        campaign
      };
      
    } catch (error) {
      console.error('Campaign activation error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Process retry attempts for failed campaigns
   * @returns {Object} Retry processing results
   */
  static async processRetryAttempts() {
    await dbConnect();
    
    try {
      const now = new Date();
      
      // Find campaigns ready for retry
      const retryCampaigns = await Campaign.find({
        status: { $in: ['failed', 'pending_scheduled'] },
        'scheduling.autoActivateWhenReady': true,
        'validation.nextRetryAt': { $lte: now }
      });
      
      console.log(`Found ${retryCampaigns.length} campaigns ready for retry`);
      
      const results = {
        processed: 0,
        succeeded: 0,
        failed: 0,
        errors: []
      };
      
      for (const campaign of retryCampaigns) {
        results.processed++;
        
        try {
          // Re-validate and potentially activate
          const validation = await CampaignValidationService.validateCampaign(campaign._id);
          
          if (validation.valid) {
            // Try to activate if it's time
            if (campaign.isReadyToStart()) {
              const activationResult = await this.activateCampaign(campaign._id);
              if (activationResult.success) {
                results.succeeded++;
              } else {
                results.failed++;
                results.errors.push({
                  campaignId: campaign._id,
                  error: activationResult.error
                });
              }
            } else {
              // Mark as scheduled and wait
              campaign.status = 'scheduled';
              await campaign.save();
              results.succeeded++;
            }
          } else {
            // Still invalid, schedule next retry
            const retryDelay = this.calculateRetryDelay(campaign.validation.retryCount);
            campaign.validation.retryCount += 1;
            campaign.validation.nextRetryAt = new Date(Date.now() + retryDelay);
            
            // Stop retrying after max attempts
            if (campaign.validation.retryCount >= 10) {
              campaign.status = 'failed';
              campaign.validation.nextRetryAt = undefined;
            }
            
            await campaign.save();
            results.failed++;
          }
        } catch (error) {
          results.failed++;
          results.errors.push({
            campaignId: campaign._id,
            error: error.message
          });
        }
      }
      
      return results;
      
    } catch (error) {
      console.error('Error processing retry attempts:', error);
      return {
        processed: 0,
        succeeded: 0,
        failed: 0,
        errors: [{ error: error.message }]
      };
    }
  }
  
  /**
   * Calculate retry delay with exponential backoff
   * @param {number} retryCount - Current retry count
   * @returns {number} Delay in milliseconds
   */
  static calculateRetryDelay(retryCount) {
    // Exponential backoff: 5min, 10min, 20min, 40min, 1hr, 2hr, 4hr, 8hr, 12hr, 24hr
    const baseDelay = 5 * 60 * 1000; // 5 minutes
    const maxDelay = 24 * 60 * 60 * 1000; // 24 hours
    
    const delay = Math.min(baseDelay * Math.pow(2, retryCount), maxDelay);
    return delay;
  }
  
  /**
   * Reschedule a campaign
   * @param {string} campaignId - Campaign ID
   * @param {Date} newStartDateTime - New start time
   * @returns {Object} Reschedule result
   */
  static async rescheduleCampaign(campaignId, newStartDateTime) {
    await dbConnect();
    
    try {
      const campaign = await Campaign.findById(campaignId);
      if (!campaign) {
        return { success: false, error: 'Campaign not found' };
      }
      
      if (!campaign.isScheduled()) {
        return { success: false, error: 'Campaign is not in a schedulable state' };
      }
      
      // Update schedule
      campaign.scheduling = campaign.scheduling || {};
      campaign.scheduling.startDateTime = newStartDateTime;
      campaign.scheduledAt = new Date();
      
      // Reset validation status to trigger re-check
      campaign.validation.status = 'pending';
      campaign.validation.lastChecked = undefined;
      
      await campaign.save();
      
      return {
        success: true,
        message: 'Campaign rescheduled successfully',
        newStartDateTime,
        campaign
      };
      
    } catch (error) {
      console.error('Campaign reschedule error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Schedule a single prospect for immediate sending
   * @param {string} campaignId - Campaign ID
   * @param {string} prospectId - Prospect ID
   * @param {number} delay - Delay in milliseconds before sending
   * @returns {Object} Scheduling result
   */
  static async scheduleProspect(campaignId, prospectId, delay = 0) {
    try {
      await dbConnect();

      const campaignProspect = await CampaignProspect.findOne({
        campaign: campaignId,
        prospect: prospectId
      });

      if (!campaignProspect) {
        throw new Error('CampaignProspect not found');
      }

      const now = new Date();
      const scheduleTime = new Date(now.getTime() + delay);

      campaignProspect.status = 'active';
      campaignProspect.nextSendAt = scheduleTime;
      campaignProspect.sequenceStep = 1;
      campaignProspect.startedAt = now;

      await campaignProspect.save();

      console.log(`✅ Scheduled prospect ${prospectId} for campaign ${campaignId} at ${scheduleTime.toISOString()}`);
      return {
        success: true,
        nextSendAt: scheduleTime,
        campaignProspect: campaignProspect.toObject()
      };

    } catch (error) {
      console.error(`Failed to schedule prospect ${prospectId}:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}
