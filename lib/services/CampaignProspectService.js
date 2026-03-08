import CampaignProspect from '../../models/CampaignProspect.js';
import Campaign from '../../models/Campaign.js';
import { convertScheduledTimeToUTC, isWithinBusinessHours } from '../timeUtils.js';
import { calculateNextActionAt } from '../outreachEngine.js';

export class CampaignProspectService {
  /**
   * Count pending prospects
   * @param {string} campaignId - Optional campaign ID to filter by
   * @returns {Promise<number>} Number of pending prospects
   */
  static async countPendingProspects(campaignId = null) {
    const query = { status: 'pending' };
    
    if (campaignId) {
      query.campaign = campaignId;
    }
    
    return await CampaignProspect.countDocuments(query);
  }

  /**
   * Synchronize prospect statuses with campaign status
   * @param {string} campaignId - Campaign ID
   * @param {string} campaignStatus - New campaign status
   * @param {Object} options - Additional options
   */
  static async syncProspectsWithCampaignStatus(campaignId, campaignStatus, options = {}) {
    console.log(`Syncing prospects for campaign ${campaignId} to status: ${campaignStatus}`);
    
    try {
      const prospects = await CampaignProspect.find({ campaign: campaignId });
      const campaign = await Campaign.findById(campaignId);
      const updates = [];
      
      for (const prospect of prospects) {
        const setFields = { updatedAt: new Date() };
        
        switch (campaignStatus) {
          case 'active':
            // Campaign is active - activate pending prospects
            if (prospect.status === 'pending') {
              setFields.status = 'active';
              setFields.startedAt = new Date();
              
              // ✅ V2 ENGINE: Initialize v2State and nextActionAt on campaign activation
              // Stagger nextActionAt so leads don't all fire at once.
              // Each lead gets a 30-90s random offset × its position in the batch.
              // With 50 leads, sends spread across ~25-75 minutes of cron windows.
              if (campaign && campaign.useV2Engine) {
                const baseNextAction = calculateNextActionAt(campaign, 0);
                const staggerMs = updates.length * (30_000 + Math.floor(Math.random() * 60_000)); // 30-90s per lead
                const staggeredTime = new Date(baseNextAction.getTime() + staggerMs);

                setFields.v2State = 'new';
                setFields.nextActionAt = staggeredTime;
                setFields.attemptCount = 0;
                setFields.failureCount = 0;
                console.log(`[V2] Initialized prospect ${prospect._id}: v2State=new, nextActionAt=${staggeredTime.toISOString()} (stagger: +${Math.round(staggerMs/1000)}s)`);
              }
              
              // Legacy: Only set immediate send time if no nextSendAt exists
              // This preserves originally scheduled times during manual activation
              if (!prospect.nextSendAt) {
                const staggerDelay = updates.length * 2 * 60 * 1000; // 2 minutes between prospects
                setFields.nextSendAt = new Date(Date.now() + staggerDelay);
                console.log(`Setting immediate staggered time for prospect ${prospect._id}: ${setFields.nextSendAt}`);
              } else {
                // Preserve the originally scheduled time
                console.log(`Preserving originally scheduled time for prospect ${prospect._id}: ${prospect.nextSendAt}`);
              }
            }
            break;
            
          case 'paused':
            // Campaign is paused - pause active prospects
            if (prospect.status === 'active') {
              setFields.status = 'paused';
              setFields.pausedAt = new Date();
            }
            break;
            
          case 'cancelled':
            // Campaign is cancelled - cancel all non-completed prospects
            if (['pending', 'active', 'paused'].includes(prospect.status)) {
              setFields.status = 'cancelled';
              setFields.cancelledAt = new Date();
              setFields.nextSendAt = null;
            }
            break;
            
          case 'draft':
            // Campaign back to draft - reset active prospects to pending
            if (prospect.status === 'active') {
              setFields.status = 'pending';
              setFields.nextSendAt = null;
              setFields.startedAt = null;
            }
            break;
            
          case 'scheduled':
            if (prospect.status === 'pending' && options.startDateTime) {
              const staggerDelay = updates.length * 2 * 60 * 1000;
              const scheduledTime = new Date(options.startDateTime.getTime() + staggerDelay);
              setFields.nextSendAt = scheduledTime;
              console.log(`Scheduled prospect ${prospect._id} for ${scheduledTime.toISOString()}`);
            }
            break;
        }
        
        // Only add update if there are changes
        if (Object.keys(setFields).length > 1) { // More than just updatedAt
          updates.push({
            updateOne: {
              filter: { _id: prospect._id },
              update: { $set: setFields }
            }
          });
        }
      }
      
      if (updates.length > 0) {
        const result = await CampaignProspect.bulkWrite(updates);
        console.log(`Synced ${updates.length} prospects for campaign ${campaignId}:`, result.modifiedCount, 'modified');
        return { success: true, modified: result.modifiedCount };
      } else {
        console.log(`No prospect updates needed for campaign ${campaignId}`);
        return { success: true, modified: 0 };
      }
      
    } catch (error) {
      console.error(`Failed to sync prospects for campaign ${campaignId}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get pending prospects grouped by campaign
   * @returns {Promise<Array>} Array of campaign stats with pending counts
   */
  static async getPendingProspectsByCampaign() {
    try {
      const pendingStats = await CampaignProspect.aggregate([
        { $match: { status: 'pending' } },
        {
          $group: {
            _id: '$campaign',
            pendingCount: { $sum: 1 }
          }
        },
        {
          $lookup: {
            from: 'campaigns',
            localField: '_id',
            foreignField: '_id',
            as: 'campaign'
          }
        },
        { $unwind: '$campaign' },
        {
          $project: {
            campaignId: '$_id',
            campaignName: '$campaign.name',
            campaignStatus: '$campaign.status',
            pendingCount: 1
          }
        },
        { $sort: { pendingCount: -1 } }
      ]);
      
      return pendingStats;
    } catch (error) {
      console.error('Error getting pending prospects by campaign:', error);
      return [];
    }
  }
}
