import dbConnect from '../../../../lib/mongodb.js';
import CampaignProspect from '../../../../models/CampaignProspect.js';
import Campaign from '../../../../models/Campaign.js';

export async function POST(request) {
  try {
    await dbConnect();

    // Update all completed prospects to active (for AI follow-ups)
    const result = await CampaignProspect.updateMany(
      { 
        status: 'completed',
        emailsReplied: 0,
        aiFollowUpsGenerated: { $lt: 5 }
      },
      { 
        $set: { 
          status: 'active'
        }
      }
    );

    // Update Austin campaign to active
    const austinResult = await Campaign.updateOne(
      { name: 'Austin' },
      { $set: { status: 'active' } }
    );

    return Response.json({
      success: true,
      prospectsUpdated: result.modifiedCount,
      austinCampaignUpdated: austinResult.modifiedCount
    });

  } catch (error) {
    console.error('Fix status error:', error);
    return Response.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
