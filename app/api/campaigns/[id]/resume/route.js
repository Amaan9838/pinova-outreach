import dbConnect from '../../../../../lib/mongodb.js';
import Campaign from '../../../../../models/Campaign.js';
import { CampaignProspectService } from '../../../../../lib/services/CampaignProspectService.js';

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

    // Update campaign status
    campaign.status = 'active';
    campaign.resumedAt = new Date();
    await campaign.save();

    // Sync prospects with campaign status - resume paused prospects
    const syncResult = await CampaignProspectService.syncProspectsWithCampaignStatus(
      id,
      'active'
    );

    if (!syncResult.success) {
      console.error(`Failed to sync prospects for campaign ${id}:`, syncResult.error);
    } else {
      console.log(`Synced ${syncResult.modified} prospects for campaign ${id}`);
    }

    return Response.json({
      success: true,
      message: 'Campaign resumed successfully',
      campaign
    });

  } catch (error) {
    console.error('Resume campaign error:', error);
    return Response.json(
      { success: false, error: 'Failed to resume campaign: ' + error.message },
      { status: 500 }
    );
  }
}
