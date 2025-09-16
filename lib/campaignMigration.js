import dbConnect from './mongodb.js';
import Campaign from '../models/Campaign.js';
import CampaignProspect from '../models/CampaignProspect.js';
import Prospect from '../models/Prospect.js';

/**
 * Campaign Migration Service
 * 
 * Helps migrate campaigns from the old embedded prospects system 
 * to the new CampaignProspect junction table model
 */
export class CampaignMigrationService {
  
  /**
   * Migrate a single campaign from old to new prospect system
   * @param {string} campaignId - Campaign ID to migrate
   * @returns {Object} Migration result
   */
  static async migrateCampaign(campaignId) {
    try {
      await dbConnect();
      
      const campaign = await Campaign.findById(campaignId);
      if (!campaign) {
        return {
          success: false,
          error: 'Campaign not found'
        };
      }
      
      // Check if already migrated
      const existingCampaignProspects = await CampaignProspect.countDocuments({
        campaign: campaignId
      });
      
      if (existingCampaignProspects > 0) {
        return {
          success: true,
          message: 'Campaign already migrated',
          migrated: 0,
          existing: existingCampaignProspects
        };
      }
      
      // Check if campaign has old prospects to migrate
      if (!campaign.prospects || campaign.prospects.length === 0) {
        return {
          success: true,
          message: 'No prospects to migrate',
          migrated: 0
        };
      }
      
      let migrated = 0;
      let errors = [];
      
      // Migrate each prospect
      for (const prospectRef of campaign.prospects) {
        try {
          if (!prospectRef.prospectId) {
            errors.push('Missing prospect ID in campaign prospects array');
            continue;
          }
          
          // Verify prospect exists
          const prospect = await Prospect.findById(prospectRef.prospectId);
          if (!prospect) {
            errors.push(`Prospect ${prospectRef.prospectId} not found`);
            continue;
          }
          
          // Create CampaignProspect record
          const campaignProspect = new CampaignProspect({
            campaign: campaignId,
            prospect: prospectRef.prospectId,
            sequenceStep: prospectRef.currentStep || 1,
            status: this.mapOldStatusToNew(prospectRef.status || 'pending'),
            createdAt: campaign.createdAt || new Date(),
            updatedAt: new Date()
          });
          
          await campaignProspect.save();
          migrated++;
          
        } catch (error) {
          errors.push(`Failed to migrate prospect ${prospectRef.prospectId}: ${error.message}`);
        }
      }
      
      return {
        success: true,
        message: `Migrated ${migrated} prospects`,
        migrated,
        errors: errors.length > 0 ? errors : undefined
      };
      
    } catch (error) {
      return {
        success: false,
        error: 'Migration failed: ' + error.message
      };
    }
  }
  
  /**
   * Migrate all campaigns that need migration
   * @returns {Object} Migration result
   */
  static async migrateAllCampaigns() {
    try {
      await dbConnect();
      
      // Find campaigns with old prospects that haven't been migrated
      const campaigns = await Campaign.find({
        'prospects.0': { $exists: true } // Has at least one prospect in old format
      });
      
      let totalMigrated = 0;
      let campaignsMigrated = 0;
      let errors = [];
      
      for (const campaign of campaigns) {
        // Check if already migrated
        const existingCount = await CampaignProspect.countDocuments({
          campaign: campaign._id
        });
        
        if (existingCount === 0) {
          const result = await this.migrateCampaign(campaign._id);
          if (result.success && result.migrated > 0) {
            totalMigrated += result.migrated;
            campaignsMigrated++;
          }
          if (result.errors) {
            errors.push(...result.errors);
          }
        }
      }
      
      return {
        success: true,
        message: `Migrated ${campaignsMigrated} campaigns with ${totalMigrated} total prospects`,
        campaignsMigrated,
        totalMigrated,
        errors: errors.length > 0 ? errors : undefined
      };
      
    } catch (error) {
      return {
        success: false,
        error: 'Bulk migration failed: ' + error.message
      };
    }
  }
  
  /**
   * Check migration status for all campaigns
   * @returns {Object} Status report
   */
  static async getMigrationStatus() {
    try {
      await dbConnect();
      
      const totalCampaigns = await Campaign.countDocuments();
      const campaignsWithOldProspects = await Campaign.countDocuments({
        'prospects.0': { $exists: true }
      });
      const campaignsWithNewProspects = await Campaign.countDocuments({
        _id: { 
          $in: await CampaignProspect.distinct('campaign')
        }
      });
      
      // Find campaigns that have both old and new (mixed state)
      const mixedCampaigns = await Campaign.find({
        'prospects.0': { $exists: true },
        _id: { 
          $in: await CampaignProspect.distinct('campaign')
        }
      });
      
      return {
        success: true,
        status: {
          totalCampaigns,
          campaignsWithOldProspects,
          campaignsWithNewProspects,
          mixedCampaigns: mixedCampaigns.length,
          needsMigration: campaignsWithOldProspects - mixedCampaigns.length
        }
      };
      
    } catch (error) {
      return {
        success: false,
        error: 'Failed to get migration status: ' + error.message
      };
    }
  }
  
  /**
   * Map old prospect status to new CampaignProspect status
   * @param {string} oldStatus - Old status
   * @returns {string} New status
   */
  static mapOldStatusToNew(oldStatus) {
    const statusMap = {
      'pending': 'pending',
      'active': 'active',
      'completed': 'completed',
      'stopped': 'stopped'
    };
    
    return statusMap[oldStatus] || 'pending';
  }
  
  /**
   * Clean up old prospect data after successful migration
   * @param {string} campaignId - Campaign ID
   * @returns {Object} Cleanup result
   */
  static async cleanupOldProspectData(campaignId) {
    try {
      await dbConnect();
      
      // Verify migration was successful
      const campaign = await Campaign.findById(campaignId);
      if (!campaign) {
        return { success: false, error: 'Campaign not found' };
      }
      
      const oldProspectCount = campaign.prospects?.length || 0;
      const newProspectCount = await CampaignProspect.countDocuments({
        campaign: campaignId
      });
      
      if (oldProspectCount === 0) {
        return { success: true, message: 'No old prospect data to clean up' };
      }
      
      if (newProspectCount === 0) {
        return { 
          success: false, 
          error: 'Cannot clean up: no migrated prospects found' 
        };
      }
      
      if (newProspectCount < oldProspectCount) {
        return { 
          success: false, 
          error: `Migration incomplete: ${newProspectCount} new vs ${oldProspectCount} old prospects` 
        };
      }
      
      // Safe to clean up old data
      campaign.prospects = [];
      await campaign.save();
      
      return {
        success: true,
        message: `Cleaned up ${oldProspectCount} old prospect records`
      };
      
    } catch (error) {
      return {
        success: false,
        error: 'Cleanup failed: ' + error.message
      };
    }
  }
}
