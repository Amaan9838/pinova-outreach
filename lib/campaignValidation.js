import dbConnect from './mongodb.js';
import Campaign from '../models/Campaign.js';
import CampaignProspect from '../models/CampaignProspect.js';
import Mailbox from '../models/MailboxFixed.js';
import DataAccessLayer from './dataAccessLayer.js';
/**
 * Campaign Validation Service
 * 
 * Provides comprehensive validation for campaigns before scheduling/activation
 * Handles validation errors, retry logic, and status management
 */
export class CampaignValidationService {
  
  /**
   * Validate a campaign for scheduling/activation
   * @param {string} campaignId - Campaign ID to validate
   * @returns {Object} Validation result with status and errors
   */
  static async validateCampaign(campaignId, options = {}) {
    await dbConnect();
    
    try {
      const campaign = await Campaign.findById(campaignId)
        .populate('mailboxes')
        .populate('options.selectedMailbox');
      
      if (!campaign) {
        return {
          valid: false,
          errors: [{ code: 'CAMPAIGN_NOT_FOUND', message: 'Campaign not found' }]
        };
      }
      
      const errors = [];
      
      // Validate mailbox
      const mailboxValidation = await this.validateMailbox(campaign);
      if (!mailboxValidation.valid) {
        errors.push(...mailboxValidation.errors);
      }
      
      // Validate prospects
      const prospectValidation = await this.validateProspects(campaignId);
      if (!prospectValidation.valid) {
        errors.push(...prospectValidation.errors);
      }
      
      // Validate sequence
      const sequenceValidation = this.validateSequence(campaign);
      if (!sequenceValidation.valid) {
        errors.push(...sequenceValidation.errors);
      }
      
      // Validate scheduling settings with context
      const schedulingValidation = this.validateSchedulingSettings(campaign, options);
      if (!schedulingValidation.valid) {
        errors.push(...schedulingValidation.errors);
      }
      
      const isValid = errors.length === 0;
      
      // Update campaign validation status
      if (isValid) {
        campaign.clearValidationErrors();
      } else {
        errors.forEach(error => {
          campaign.addValidationError(error.code, error.message);
        });
      }
      
      await campaign.save();
      
      return {
        valid: isValid,
        errors,
        campaign
      };
      
    } catch (error) {
      console.error('Campaign validation error:', error);
      return {
        valid: false,
        errors: [{ code: 'VALIDATION_ERROR', message: error.message }]
      };
    }
  }
  
  /**
   * Validate mailbox configuration
   */
  static async validateMailbox(campaign) {
    const errors = [];
    
    // Check if mailbox is selected
    const selectedMailbox = campaign.options?.selectedMailbox || campaign.mailbox;
    if (!selectedMailbox) {
      errors.push({
        code: 'NO_MAILBOX_SELECTED',
        message: 'No mailbox selected for the campaign'
      });
      return { valid: false, errors };
    }
    
    // Fetch and validate mailbox
    const mailbox = await Mailbox.findById(selectedMailbox);
    if (!mailbox) {
      errors.push({
        code: 'MAILBOX_NOT_FOUND',
        message: 'Selected mailbox not found'
      });
      return { valid: false, errors };
    }
    
    // Check mailbox status
    if (mailbox.status !== 'active') {
      errors.push({
        code: 'MAILBOX_INACTIVE',
        message: `Mailbox ${mailbox.fromEmail} is not active`
      });
    }
    
    // Check SMTP configuration
    if (!mailbox.smtpConfiguration || 
        !mailbox.smtpConfiguration.host || 
        !mailbox.smtpConfiguration.user || 
        !mailbox.smtpConfiguration.password) {
      errors.push({
        code: 'MAILBOX_SMTP_INCOMPLETE',
        message: `Mailbox ${mailbox.fromEmail} has incomplete SMTP configuration`
      });
    }
    
    // Check daily limits
    if (mailbox.dailySent >= mailbox.dailyCap) {
      errors.push({
        code: 'MAILBOX_DAILY_LIMIT_REACHED',
        message: `Mailbox ${mailbox.fromEmail} has reached daily sending limit`
      });
    }
    
    return { valid: errors.length === 0, errors };
  }
  
  /**
   * Validate prospects - supports both new CampaignProspect model and old embedded prospects
   */
  static async validateProspects(campaignId) {
    const errors = [];
 const warnings = []; // New: Non-blocking issues
  const fixActions = []; // New: Quick fixes (e.g., { code: 'INIT_SCHEDULE', action: 'Call scheduleNextStep' })

    try {
      // Check both new CampaignProspect model and old embedded prospects
      const campaignProspectCount = await CampaignProspect.countDocuments({
        campaign: campaignId
      });
      console.log(`CampaignProspect count: ${campaignProspectCount}`);

      // Get campaign to check old prospects array
      const Campaign = (await import('../models/Campaign.js')).default;
      const campaign = await Campaign.findById(campaignId);

      if (!campaign) {
        errors.push({
          code: 'CAMPAIGN_NOT_FOUND',
          message: 'Campaign not found'
        });
        return { valid: false, errors };
      }

      const oldProspectCount = campaign.prospects?.length || 0;
      const totalProspects = Math.max(campaignProspectCount, oldProspectCount);

      if (totalProspects === 0) {
        errors.push({
          code: 'NO_PROSPECTS',
          message: 'Campaign must have at least one prospect'
        });
        return { valid: false, errors };
      }

      // If using new CampaignProspect model, validate those
      if (campaignProspectCount > 0) {
        const campaignProspects = await CampaignProspect.find({
          campaign: campaignId
        }).populate('prospect');

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        let invalidEmailCount = 0;

        campaignProspects.forEach(cp => {
          if (!cp.prospect || !emailRegex.test(cp.prospect.email || '')) {
            invalidEmailCount++;
          }
        });

        if (invalidEmailCount > 0) {
          errors.push({
            code: 'INVALID_PROSPECT_EMAILS',
            message: `${invalidEmailCount} prospects have invalid email addresses`
          });
        }

        // Validate scheduling readiness for active campaigns
        if (campaign.status === 'active' || campaign.status === 'scheduled') {
          const unscheduledProspects = campaignProspects.filter(cp =>
            cp.status === 'active' && !cp.nextSendAt
          );

          if (unscheduledProspects.length > 0) {
            errors.push({
              code: 'UNSCHEDULED_PROSPECTS',
              message: `${unscheduledProspects.length} active prospects are missing scheduling information`
            });
          }

          // Check for prospects with past send times that haven't been processed
          const overdueProspects = campaignProspects.filter(cp =>
            cp.status === 'active' &&
            cp.nextSendAt &&
            new Date(cp.nextSendAt) < new Date(Date.now() - 60 * 60 * 1000) // 1 hour ago
          );

          if (overdueProspects.length > 0) {
            errors.push({
              code: 'OVERDUE_PROSPECTS',
              message: `${overdueProspects.length} prospects have overdue send times and may need attention`
            });
          }
        }
      } else if (oldProspectCount > 0) {
        // Validate old embedded prospects system
        const Prospect = (await import('../models/Prospect.js')).default;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        let invalidEmailCount = 0;

        for (const prospectRef of campaign.prospects) {
          if (prospectRef.prospectId) {
            const prospect = await Prospect.findById(prospectRef.prospectId);
            if (!prospect || !emailRegex.test(prospect.email || '')) {
              invalidEmailCount++;
            }
          } else {
            invalidEmailCount++;
          }
        }

        if (invalidEmailCount > 0) {
          errors.push({
            code: 'INVALID_PROSPECT_EMAILS',
            message: `${invalidEmailCount} prospects have invalid email addresses`
          });
        }
      }

    } catch (error) {
      errors.push({
        code: 'PROSPECT_VALIDATION_ERROR',
        message: 'Failed to validate prospects: ' + error.message
      });
    }

    return { valid: errors.length === 0, errors };
  }
  
  /**
   * Validate sequence configuration
   */
  static validateSequence(campaign) {
    const errors = [];
    
    if (!campaign.sequence || campaign.sequence.length === 0) {
      errors.push({
        code: 'NO_SEQUENCE_STEPS',
        message: 'Campaign must have at least one sequence step'
      });
      return { valid: false, errors };
    }
    
    // Validate each step
    campaign.sequence.forEach((step, index) => {
      if (!step.subject || step.subject.trim() === '') {
        errors.push({
          code: 'EMPTY_SUBJECT',
          message: `Step ${index + 1} has empty subject line`
        });
      }
      
      if (!step.template || step.template.trim() === '') {
        errors.push({
          code: 'EMPTY_TEMPLATE',
          message: `Step ${index + 1} has empty email template`
        });
      }
      
      // Validate wait times for follow-up steps
      if (index > 0) {
        const waitHours = step.waitHours || 0;
        const waitMinutes = step.waitMinutes || 0;
        
        if (waitHours === 0 && waitMinutes === 0) {
          errors.push({
            code: 'NO_WAIT_TIME',
            message: `Step ${index + 1} has no wait time configured`
          });
        }
      }
    });
    
    return { valid: errors.length === 0, errors };
  }
  
  /**
   * Validate scheduling settings
   */
  static validateSchedulingSettings(campaign, options = {}) {
    const errors = [];
    
    if (campaign.scheduling?.startDateTime) {
      const startTime = new Date(campaign.scheduling.startDateTime);
      const now = new Date();
      
      // Only check for future time if we're not in activation or manual start context
      // During activation or manual start, past times are acceptable (campaign was scheduled in past, now ready to activate)
      if (startTime <= now && !options.isActivation && !options.isManualStart) {
        errors.push({
          code: 'START_TIME_IN_PAST',
          message: 'Campaign start time must be in the future'
        });
      }
      
      // Validate business hours if enabled
      if (campaign.scheduling.businessHours?.enabled) {
        const { startTime: businessStart, endTime: businessEnd } = campaign.scheduling.businessHours;
        
        if (!this.isValidTimeFormat(businessStart)) {
          errors.push({
            code: 'INVALID_BUSINESS_START_TIME',
            message: 'Invalid business hours start time format'
          });
        }
        
        if (!this.isValidTimeFormat(businessEnd)) {
          errors.push({
            code: 'INVALID_BUSINESS_END_TIME',
            message: 'Invalid business hours end time format'
          });
        }
      }
    }
    
    return { valid: errors.length === 0, errors };
  }
  
  /**
   * Validate time format (HH:mm)
   */
  static isValidTimeFormat(time) {
    return /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(time);
  }
  
  /**
   * Get validation summary for multiple campaigns
   */
  static async validateMultipleCampaigns(campaignIds) {
    const results = await Promise.all(
      campaignIds.map(id => this.validateCampaign(id))
    );
    
    return results.reduce((summary, result, index) => {
      summary[campaignIds[index]] = result;
      return summary;
    }, {});
  }
}
