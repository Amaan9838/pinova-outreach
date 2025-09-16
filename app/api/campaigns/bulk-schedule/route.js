import dbConnect from '../../../../lib/mongodb.js';
import { CampaignSchedulingService } from '../../../../lib/campaignScheduling.js';

export const dynamic = 'force-dynamic';

/**
 * Bulk schedule multiple campaigns
 */
export async function POST(request) {
  try {
    await dbConnect();
    
    const { campaigns, defaultSettings } = await request.json();
    
    if (!campaigns || !Array.isArray(campaigns) || campaigns.length === 0) {
      return Response.json(
        { success: false, error: 'Campaigns array is required' },
        { status: 400 }
      );
    }
    
    const results = {
      scheduled: 0,
      pending: 0,
      failed: 0,
      errors: []
    };
    
    for (const campaignSchedule of campaigns) {
      const { campaignId, startDateTime, ...options } = campaignSchedule;
      
      try {
        // Merge with default settings
        const scheduleOptions = { ...defaultSettings, ...options };
        
        const result = await CampaignSchedulingService.scheduleCampaign(
          campaignId,
          new Date(startDateTime),
          scheduleOptions
        );
        
        if (result.success) {
          if (result.status === 'scheduled') {
            results.scheduled++;
          } else if (result.status === 'pending_scheduled') {
            results.pending++;
          }
        } else {
          results.failed++;
          results.errors.push({
            campaignId,
            error: result.error
          });
        }
      } catch (error) {
        results.failed++;
        results.errors.push({
          campaignId,
          error: error.message
        });
      }
    }
    
    return Response.json({
      success: true,
      message: `Bulk scheduling completed: ${results.scheduled} scheduled, ${results.pending} pending, ${results.failed} failed`,
      results
    });
    
  } catch (error) {
    console.error('Bulk schedule error:', error);
    return Response.json(
      { success: false, error: 'Failed to bulk schedule campaigns: ' + error.message },
      { status: 500 }
    );
  }
}

/**
 * Bulk pause/resume scheduled campaigns
 */
export async function PATCH(request) {
  try {
    await dbConnect();
    
    const { campaignIds, action } = await request.json();
    
    if (!campaignIds || !Array.isArray(campaignIds) || campaignIds.length === 0) {
      return Response.json(
        { success: false, error: 'Campaign IDs array is required' },
        { status: 400 }
      );
    }
    
    if (!['pause', 'resume', 'cancel'].includes(action)) {
      return Response.json(
        { success: false, error: 'Invalid action. Must be pause, resume, or cancel' },
        { status: 400 }
      );
    }
    
    const Campaign = (await import('../../../../models/Campaign.js')).default;
    
    const results = {
      updated: 0,
      failed: 0,
      errors: []
    };
    
    for (const campaignId of campaignIds) {
      try {
        const campaign = await Campaign.findById(campaignId);
        
        if (!campaign) {
          results.failed++;
          results.errors.push({
            campaignId,
            error: 'Campaign not found'
          });
          continue;
        }
        
        let updated = false;
        
        switch (action) {
          case 'pause':
            if (['scheduled', 'active'].includes(campaign.status)) {
              campaign.status = 'paused';
              campaign.pausedAt = new Date();
              updated = true;
            }
            break;
            
          case 'resume':
            if (campaign.status === 'paused') {
              // Determine if it should go back to scheduled or active
              if (campaign.scheduling?.startDateTime && new Date() < campaign.scheduling.startDateTime) {
                campaign.status = 'scheduled';
              } else {
                campaign.status = 'active';
              }
              campaign.pausedAt = undefined;
              updated = true;
            }
            break;
            
          case 'cancel':
            if (campaign.isScheduled()) {
              campaign.status = 'cancelled';
              campaign.cancelledAt = new Date();
              campaign.scheduling.startDateTime = undefined;
              updated = true;
            }
            break;
        }
        
        if (updated) {
          await campaign.save();
          results.updated++;
        } else {
          results.failed++;
          results.errors.push({
            campaignId,
            error: `Cannot ${action} campaign with status: ${campaign.status}`
          });
        }
        
      } catch (error) {
        results.failed++;
        results.errors.push({
          campaignId,
          error: error.message
        });
      }
    }
    
    return Response.json({
      success: true,
      message: `Bulk ${action} completed: ${results.updated} updated, ${results.failed} failed`,
      results
    });
    
  } catch (error) {
    console.error('Bulk campaign action error:', error);
    return Response.json(
      { success: false, error: 'Failed to perform bulk action: ' + error.message },
      { status: 500 }
    );
  }
}
