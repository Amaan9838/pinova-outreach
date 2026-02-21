import dbConnect from '../../../../../../lib/mongodb.js';
import CampaignProspect from '../../../../../../models/CampaignProspect.js';
import Campaign from '../../../../../../models/Campaign.js';
import { calculateNextActionAt } from '../../../../../../lib/outreachEngine.js';

export const dynamic = 'force-dynamic';

/**
 * Activate all pending prospects for a campaign
 */
export async function POST(request, { params }) {
  try {
    await dbConnect();
    
    const { id } = params;
    
    // Get campaign to check status
    const campaign = await Campaign.findById(id);
    if (!campaign) {
      return Response.json(
        { success: false, error: 'Campaign not found' },
        { status: 404 }
      );
    }
    
    // Find all pending prospects for this campaign
    const pendingProspects = await CampaignProspect.find({
      campaign: id,
      status: 'pending'
    });
    
    if (pendingProspects.length === 0) {
      return Response.json({
        success: true,
        message: 'No pending prospects to activate',
        activated: 0
      });
    }
    
    // Get full campaign with V2 settings
    const campaignWithScheduling = await Campaign.findById(id).select('scheduling status useV2Engine v2Timezone v2BusinessHours v2Delays');

    // Prepare bulk update operations
    const updates = pendingProspects.map((prospect, index) => {
      const staggerDelay = index * 2 * 60 * 1000; // 2 minutes between prospects
      let nextSendAt;
      let nextActionAt;
      let v2State;
      let attemptCount = 0;

      // ✅ CRITICAL FIX: Support both V2 and legacy activation
      if (campaign.useV2Engine) {
        // V2 ENGINE: Initialize for automated processing
        v2State = 'new';
        
        // Calculate next action respecting business hours and delays
        nextActionAt = calculateNextActionAt(campaign, 0);
        
        console.log(`[V2] Activating prospect ${prospect._id}: v2State=new, nextActionAt=${nextActionAt.toISOString()}`);
      } else {
        // LEGACY: Calculate staggered send time
        if (campaignWithScheduling?.scheduling?.startDateTime &&
            ['scheduled', 'pending_scheduled'].includes(campaignWithScheduling.status)) {
          // Use the campaign's scheduled time + stagger
          nextSendAt = new Date(campaignWithScheduling.scheduling.startDateTime.getTime() + staggerDelay);
          console.log(`[Legacy] Activating prospect ${prospect._id} with scheduled time: ${nextSendAt.toISOString()}`);
        } else if (prospect.nextSendAt) {
          // Preserve existing scheduled time if it exists
          nextSendAt = prospect.nextSendAt;
          console.log(`[Legacy] Preserving existing scheduled time for prospect ${prospect._id}: ${nextSendAt.toISOString()}`);
        } else {
          // Fallback to immediate activation with stagger
          nextSendAt = new Date(Date.now() + staggerDelay);
          console.log(`[Legacy] Setting immediate staggered time for prospect ${prospect._id}: ${nextSendAt.toISOString()}`);
        }
      }

      const updateFields = {
        status: 'active',
        startedAt: new Date(),
        updatedAt: new Date()
      };

      // Add appropriate scheduling fields based on engine type
      if (campaign.useV2Engine) {
        updateFields.v2State = v2State;
        updateFields.nextActionAt = nextActionAt;
        updateFields.attemptCount = attemptCount;
        updateFields.failureCount = 0;
      } else {
        updateFields.nextSendAt = nextSendAt;
      }

      return {
        updateOne: {
          filter: { 
            _id: prospect._id,
            status: 'pending' // ONLY update if still pending
          },
          update: {
            $set: updateFields
          }
        }
      };
    });
    
    // Execute bulk update
    const result = await CampaignProspect.bulkWrite(updates);
    
    console.log(`Activated ${result.modifiedCount} pending prospects for campaign ${id}`);
    
    return Response.json({
      success: true,
      message: `Successfully activated ${result.modifiedCount} prospects`,
      activated: result.modifiedCount
    });
    
  } catch (error) {
    console.error('Activate pending prospects error:', error);
    return Response.json(
      { success: false, error: 'Failed to activate prospects: ' + error.message },
      { status: 500 }
    );
  }
}
