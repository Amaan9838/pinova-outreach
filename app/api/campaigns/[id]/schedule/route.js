import dbConnect from '../../../../../lib/mongodb.js';
import Campaign from '../../../../../models/Campaign.js';
import { CampaignProspectService } from '../../../../../lib/services/CampaignProspectService.js';
import { CampaignValidationService } from '../../../../../lib/campaignValidation.js';
import { convertScheduledTimeToUTC } from '../../../../../lib/timeUtils.js';

export const dynamic = 'force-dynamic';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

function parseDailyCap(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseStartTimePayload(body, timezone) {
  const { startDate, startTime, startDateTime } = body;

  if (startDate && startTime) {
    if (!DATE_PATTERN.test(startDate) || !TIME_PATTERN.test(startTime)) {
      return { error: 'Invalid startDate/startTime format' };
    }

    const localWallClock = `${startDate}T${startTime}:00`;
    const utcStartTime = convertScheduledTimeToUTC(localWallClock, timezone);

    if (!utcStartTime || Number.isNaN(utcStartTime.getTime())) {
      return { error: 'Invalid scheduled date/time' };
    }

    return { utcStartTime };
  }

  if (!startDateTime) {
    return { error: 'Missing start date and time' };
  }

  const parsed = new Date(startDateTime);
  if (Number.isNaN(parsed.getTime())) {
    return { error: 'Invalid date format' };
  }

  // Backward compatibility for older clients.
  const utcStartTime = timezone === 'UTC'
    ? parsed
    : convertScheduledTimeToUTC(startDateTime, timezone);

  if (!utcStartTime || Number.isNaN(utcStartTime.getTime())) {
    return { error: 'Invalid scheduled date/time' };
  }

  return { utcStartTime };
}

export async function POST(request, { params }) {
  try {
    await dbConnect();

    const { id } = params;
    const body = await request.json();
    const {
      timezone = 'UTC',
      businessHours,
      staggerSettings,
      dailySendCap,
      autoActivateWhenReady
    } = body;

    const parsedStart = parseStartTimePayload(body, timezone);
    if (parsedStart.error) {
      return Response.json({
        success: false,
        error: parsedStart.error,
        details: 'Please provide a valid date and time'
      }, { status: 400 });
    }

    const utcStartTime = parsedStart.utcStartTime;
    const now = new Date();

    if (utcStartTime <= now) {
      const minutesDiff = Math.round((now - utcStartTime) / 60000);
      return Response.json({
        success: false,
        error: 'Start time must be in the future',
        details: `The selected time is ${minutesDiff} minute(s) in the past. Please choose a future time.`
      }, { status: 400 });
    }

    const campaign = await Campaign.findById(id);
    if (!campaign) {
      return Response.json({
        success: false,
        error: 'Campaign not found',
        details: `No campaign exists with ID: ${id}`
      }, { status: 404 });
    }

    if (!['draft', 'pending_scheduled', 'scheduled', 'failed', 'paused'].includes(campaign.status)) {
      return Response.json({
        success: false,
        error: `Cannot schedule campaign from status: ${campaign.status}`
      }, { status: 400 });
    }

    if (campaign.status === 'completed') {
      return Response.json({
        success: false,
        error: 'Cannot schedule completed campaign',
        details: 'This campaign has already been completed. Create a new campaign instead.'
      }, { status: 400 });
    }

    const validation = await CampaignValidationService.validateCampaign(id);
    if (!validation.valid) {
      const errorList = validation.errors.map((e) => e.message).join(', ');
      return Response.json({
        success: false,
        error: 'Campaign validation failed',
        details: errorList,
        errors: validation.errors
      }, { status: 400 });
    }

    const resolvedDailyCap = parseDailyCap(
      dailySendCap,
      campaign.scheduling?.dailySendCap || campaign.v2Limits?.dailySendLimit || 50
    );

    campaign.scheduling = {
      ...campaign.scheduling,
      timezone,
      startDateTime: utcStartTime,
      businessHours: businessHours || campaign.scheduling?.businessHours,
      staggerSettings: staggerSettings || campaign.scheduling?.staggerSettings,
      dailySendCap: resolvedDailyCap,
      autoActivateWhenReady: autoActivateWhenReady ?? campaign.scheduling?.autoActivateWhenReady ?? false
    };

    // Keep v2 fields synchronized with schedule settings.
    if (campaign.useV2Engine) {
      const fallbackStartHour = campaign.v2BusinessHours?.startHour ?? 9;
      const fallbackEndHour = campaign.v2BusinessHours?.endHour ?? 17;
      const startHour = businessHours?.startTime
        ? Number.parseInt(businessHours.startTime.split(':')[0], 10)
        : fallbackStartHour;
      const endHour = businessHours?.endTime
        ? Number.parseInt(businessHours.endTime.split(':')[0], 10)
        : fallbackEndHour;

      campaign.v2Timezone = timezone;
      campaign.v2BusinessHours = {
        startHour: Number.isFinite(startHour) ? startHour : fallbackStartHour,
        endHour: Number.isFinite(endHour) ? endHour : fallbackEndHour
      };
      campaign.v2Limits = {
        dailySendLimit: resolvedDailyCap,
        hourlySendLimit: campaign.v2Limits?.hourlySendLimit || 10,
        minGapMinutes: campaign.v2Limits?.minGapMinutes || 3
      };
    }

    const isV2Campaign = Boolean(campaign.useV2Engine);
    campaign.status = isV2Campaign ? 'scheduled' : 'active';
    campaign.scheduledAt = new Date();
    await campaign.save();

    // Legacy campaigns keep historical behavior (schedule + activate now).
    // v2 campaigns are activated by cron at startDateTime.
    let syncResult = { success: true, modified: 0 };
    if (!isV2Campaign) {
      const scheduledSync = await CampaignProspectService.syncProspectsWithCampaignStatus(
        id,
        'scheduled',
        { startDateTime: utcStartTime }
      );

      if (!scheduledSync.success) {
        return Response.json({
          success: false,
          error: 'Failed to schedule prospects',
          details: scheduledSync.error || 'Could not set send times for prospects'
        }, { status: 500 });
      }

      syncResult = await CampaignProspectService.syncProspectsWithCampaignStatus(id, 'active');
      if (!syncResult.success) {
        return Response.json({
          success: false,
          error: 'Failed to activate prospects',
          details: syncResult.error || 'Could not activate prospects'
        }, { status: 500 });
      }
    }

    const timeUntilStart = Math.round((utcStartTime - now) / 60000);

    return Response.json({
      success: true,
      message: isV2Campaign
        ? `Campaign scheduled for ${utcStartTime.toISOString()}. It will auto-activate in ${timeUntilStart} minute(s).`
        : `Campaign scheduled and activated. ${syncResult.modified || 0} prospect(s) were prepared for sending.`,
      campaign,
      stats: {
        prospectsScheduled: syncResult.modified || 0,
        startTime: utcStartTime.toISOString(),
        minutesUntilStart: timeUntilStart
      }
    });
  } catch (error) {
    console.error('Campaign schedule error:', error);

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
