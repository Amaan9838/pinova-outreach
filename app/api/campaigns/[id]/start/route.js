import dbConnect from '../../../../../lib/mongodb.js';
import Campaign from '../../../../../models/Campaign.js';
import CampaignProspect from '../../../../../models/CampaignProspect.js';
import { CampaignProspectService } from '../../../../../lib/services/CampaignProspectService.js';
import { CampaignValidationService } from '../../../../../lib/campaignValidation.js';
import { CampaignNotificationService } from '../../../../../lib/campaignNotifications.js';

export async function POST(request, { params }) {
  try {
    await dbConnect();
    
    const { id } = params;
    
    const campaign = await Campaign.findById(id);
    if (!campaign) {
      return Response.json(
        { success: false, error: 'Campaign not found' },
        { status: 404 }
      );
    }

    // Check if campaign can be started
    if (!['draft', 'pending_scheduled', 'scheduled', 'failed', 'paused'].includes(campaign.status)) {
      return Response.json(
        { success: false, error: `Campaign cannot be started from status: ${campaign.status}` },
        { status: 400 }
      );
    }

    // Perform full validation (with manual start context - allows past start times)
    console.log(`Validating campaign ${id} for manual start...`);
    const validation = await CampaignValidationService.validateCampaign(id, { isManualStart: true });
    
    if (!validation.valid) {
      const errorMessages = validation.errors.map(e => e.message).join(', ');
      console.log(`Campaign validation failed: ${errorMessages}`);
      
      return Response.json(
        {
          success: false,
          error: `Campaign validation failed: ${errorMessages}`,
          errors: validation.errors
        },
        { status: 400 }
      );
    }

    console.log(`Campaign ${id} validation passed, starting campaign...`);

    // Store previous status for notifications
    const previousStatus = campaign.status;

    // Update campaign status
    campaign.status = 'active';
    campaign.startedAt = new Date();
    
    // Clear any validation errors since we're starting successfully
    campaign.validation.status = 'valid';
    campaign.validation.errors = [];
    campaign.validation.retryCount = 0;
    campaign.validation.nextRetryAt = undefined;
    
    await campaign.save();

    // Sync prospects with campaign status using the service
    const syncResult = await CampaignProspectService.syncProspectsWithCampaignStatus(
      id,
      'active'
    );

    if (!syncResult.success) {
      console.error(`Failed to sync prospects for campaign ${id}:`, syncResult.error);
      
      // If sync fails, revert campaign status
      campaign.status = previousStatus;
      await campaign.save();
      
      return Response.json(
        {
          success: false,
          error: `Failed to sync prospects: ${syncResult.error}`
        },
        { status: 500 }
      );
    } else {
      console.log(`Synced ${syncResult.modified} prospects for campaign ${id}`);
    }

    // Send notifications
    try {
      await CampaignNotificationService.notifyCampaignStatusChange(
        campaign,
        previousStatus
      );

      await CampaignNotificationService.notifySchedulingEvent(
        campaign,
        'manually_started',
        { startedAt: campaign.startedAt }
      );
    } catch (notificationError) {
      console.error('Failed to send start notifications:', notificationError);
      // Don't fail the start process due to notification issues
    }

    return Response.json({
      success: true,
      message: 'Campaign started successfully',
      campaign,
      syncResult: {
        modified: syncResult.modified
      }
    });

  } catch (error) {
    console.error('Start campaign error:', error);
    return Response.json(
      { success: false, error: 'Failed to start campaign' },
      { status: 500 }
    );
  }
}
