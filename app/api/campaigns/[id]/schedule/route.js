import dbConnect from '../../../../../lib/mongodb.js';
import { CampaignSchedulingService } from '../../../../../lib/campaignScheduling.js';

export const dynamic = 'force-dynamic';

/**
 * Schedule a campaign for future execution
 */
export async function POST(request, { params }) {
  try {
    await dbConnect();
    
    const { id } = params;
    const {
      startDateTime,
      timezone = 'UTC',
      businessHours,
      staggerSettings,
      autoActivateWhenReady = false,
      dailySendCap
    } = await request.json();
    
    if (!startDateTime) {
      return Response.json(
        { success: false, error: 'Start date and time are required' },
        { status: 400 }
      );
    }
    
    // Validate start time is in the future
    const startTime = new Date(startDateTime);
    if (startTime <= new Date()) {
      return Response.json(
        { success: false, error: 'Start time must be in the future' },
        { status: 400 }
      );
    }
    
    const options = {
      timezone,
      autoActivateWhenReady
    };
    
    if (businessHours) {
      options.businessHours = businessHours;
    }
    
    if (staggerSettings) {
      options.staggerSettings = staggerSettings;
    }
    
    if (dailySendCap) {
      options.dailySendCap = dailySendCap;
    }
    
    const result = await CampaignSchedulingService.scheduleCampaign(
      id,
      startTime,
      options
    );
    
    if (result.success) {
      return Response.json({
        success: true,
        message: result.message,
        status: result.status,
        startDateTime: result.startDateTime,
        campaign: result.campaign,
        errors: result.errors || []
      });
    } else {
      return Response.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }
    
  } catch (error) {
    console.error('Campaign schedule error:', error);
    return Response.json(
      { success: false, error: 'Failed to schedule campaign: ' + error.message },
      { status: 500 }
    );
  }
}

/**
 * Reschedule a campaign
 */
export async function PATCH(request, { params }) {
  try {
    await dbConnect();
    
    const { id } = params;
    const { startDateTime } = await request.json();
    
    if (!startDateTime) {
      return Response.json(
        { success: false, error: 'New start date and time are required' },
        { status: 400 }
      );
    }
    
    const newStartTime = new Date(startDateTime);
    if (newStartTime <= new Date()) {
      return Response.json(
        { success: false, error: 'New start time must be in the future' },
        { status: 400 }
      );
    }
    
    const result = await CampaignSchedulingService.rescheduleCampaign(
      id,
      newStartTime
    );
    
    if (result.success) {
      return Response.json({
        success: true,
        message: result.message,
        newStartDateTime: result.newStartDateTime,
        campaign: result.campaign
      });
    } else {
      return Response.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }
    
  } catch (error) {
    console.error('Campaign reschedule error:', error);
    return Response.json(
      { success: false, error: 'Failed to reschedule campaign: ' + error.message },
      { status: 500 }
    );
  }
}

/**
 * Cancel a scheduled campaign
 */
export async function DELETE(request, { params }) {
  try {
    await dbConnect();
    
    const { id } = params;
    
    const Campaign = (await import('../../../../../models/Campaign.js')).default;
    const campaign = await Campaign.findById(id);
    
    if (!campaign) {
      return Response.json(
        { success: false, error: 'Campaign not found' },
        { status: 404 }
      );
    }
    
    if (!campaign.isScheduled()) {
      return Response.json(
        { success: false, error: 'Campaign is not scheduled' },
        { status: 400 }
      );
    }
    
    // Cancel the campaign
    campaign.status = 'cancelled';
    campaign.cancelledAt = new Date();
    campaign.scheduling.startDateTime = undefined;
    
    await campaign.save();
    
    return Response.json({
      success: true,
      message: 'Campaign schedule cancelled successfully',
      campaign
    });
    
  } catch (error) {
    console.error('Campaign cancel schedule error:', error);
    return Response.json(
      { success: false, error: 'Failed to cancel campaign schedule: ' + error.message },
      { status: 500 }
    );
  }
}
