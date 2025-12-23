import dbConnect from '../../../../../lib/mongodb.js';
import Campaign from '../../../../../models/Campaign.js';
import { CampaignProspectService } from '../../../../../lib/services/CampaignProspectService.js';
import { CampaignValidationService } from '../../../../../lib/campaignValidation.js';

export const dynamic = 'force-dynamic';

export async function POST(request, { params }) {
  try {
    await dbConnect();
    
    const { id } = params;
    const body = await request.json();
    const {
      startDateTime,
      timezone = 'UTC',
      businessHours,
      staggerSettings,
      dailySendCap
    } = body;
    
    // Validation: Start date/time
    if (!startDateTime) {
      return Response.json({
        success: false,
        error: 'Missing start date and time',
        details: 'Please select a date and time to schedule your campaign'
      }, { status: 400 });
    }
    
    const startTime = new Date(startDateTime);
    if (isNaN(startTime.getTime())) {
      return Response.json({
        success: false,
        error: 'Invalid date format',
        details: 'The provided date/time is not valid'
      }, { status: 400 });
    }
    
    // Convert to UTC if timezone is not UTC
    let utcStartTime = startTime;
    if (timezone !== 'UTC') {
      const { convertScheduledTimeToUTC } = await import('../../../../../lib/timeUtils.js');
      utcStartTime = convertScheduledTimeToUTC(startTime, timezone);
      console.log(`Converting ${startTime.toISOString()} from ${timezone} to UTC: ${utcStartTime.toISOString()}`);
    }
    
    const now = new Date();
    if (utcStartTime <= now) {
      const minutesDiff = Math.round((now - utcStartTime) / 60000);
      return Response.json({
        success: false,
        error: 'Start time must be in the future',
        details: `The selected time is ${minutesDiff} minute(s) in the past. Please choose a future time.`
      }, { status: 400 });
    }
    
    // Find campaign
    const campaign = await Campaign.findById(id);
    if (!campaign) {
      return Response.json({
        success: false,
        error: 'Campaign not found',
        details: `No campaign exists with ID: ${id}`
      }, { status: 404 });
    }
    
    // Check campaign status
    if (campaign.status === 'completed') {
      return Response.json({
        success: false,
        error: 'Cannot schedule completed campaign',
        details: 'This campaign has already been completed. Create a new campaign instead.'
      }, { status: 400 });
    }
    
    // Validate campaign
    const validation = await CampaignValidationService.validateCampaign(id);
    if (!validation.valid) {
      const errorList = validation.errors.map(e => e.message).join(', ');
      return Response.json({
        success: false,
        error: 'Campaign validation failed',
        details: errorList,
        errors: validation.errors
      }, { status: 400 });
    }
    
    // Update campaign settings
    campaign.scheduling = {
      timezone,
      startDateTime: utcStartTime,
      businessHours: businessHours || campaign.scheduling?.businessHours,
      staggerSettings: staggerSettings || campaign.scheduling?.staggerSettings,
      dailySendCap: dailySendCap || campaign.scheduling?.dailySendCap
    };
    
    campaign.status = 'active';
    campaign.scheduledAt = new Date();
    await campaign.save();
    
    // Set nextSendAt for all prospects (pass UTC time)
    const syncResult = await CampaignProspectService.syncProspectsWithCampaignStatus(
      id,
      'scheduled',
      { startDateTime: utcStartTime }
    );
    
    if (!syncResult.success) {
      return Response.json({
        success: false,
        error: 'Failed to schedule prospects',
        details: syncResult.error || 'Could not set send times for prospects'
      }, { status: 500 });
    }
    
    // Activate prospects
    const activateResult = await CampaignProspectService.syncProspectsWithCampaignStatus(id, 'active');
    
    if (!activateResult.success) {
      return Response.json({
        success: false,
        error: 'Failed to activate prospects',
        details: activateResult.error || 'Could not activate prospects for sending'
      }, { status: 500 });
    }
    
    const scheduledCount = syncResult.modified || 0;
    const timeUntilStart = Math.round((utcStartTime - now) / 60000);
    
    return Response.json({
      success: true,
      message: `Campaign scheduled successfully! ${scheduledCount} prospect(s) will start receiving emails in ${timeUntilStart} minute(s).`,
      campaign,
      stats: {
        prospectsScheduled: scheduledCount,
        startTime: utcStartTime.toISOString(),
        minutesUntilStart: timeUntilStart
      }
    });
    
  } catch (error) {
    console.error('Campaign schedule error:', error);
    
    // Handle specific error types
    if (error.name === 'ValidationError') {
      return Response.json({
        success: false,
        error: 'Validation error',
        details: error.message
      }, { status: 400 });
    }
    
    if (error.name === 'CastError') {
      return Response.json({
        success: false,
        error: 'Invalid campaign ID',
        details: 'The provided campaign ID format is invalid'
      }, { status: 400 });
    }
    
    return Response.json({
      success: false,
      error: 'Failed to schedule campaign',
      details: error.message || 'An unexpected error occurred'
    }, { status: 500 });
  }
}


