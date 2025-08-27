import dbConnect from '../../../../../lib/mongodb.js';
import Campaign from '../../../../../models/Campaign.js';
import Prospect from '../../../../../models/Prospect.js';

export async function POST(request, { params }) {
  try {
    await dbConnect();
    
    const { id } = params;
    const { prospectIds } = await request.json();
    
    const campaign = await Campaign.findById(id);
    if (!campaign) {
      return Response.json(
        { success: false, error: 'Campaign not found' },
        { status: 404 }
      );
    }

    // Verify prospects exist
    const prospects = await Prospect.find({
      _id: { $in: prospectIds },
      status: 'active'
    });

    if (prospects.length !== prospectIds.length) {
      return Response.json(
        { success: false, error: 'Some prospects not found or inactive' },
        { status: 400 }
      );
    }

    // Add prospects to campaign
    const existingProspectIds = campaign.prospects.map(p => p.prospectId.toString());
    const newProspects = prospects
      .filter(prospect => !existingProspectIds.includes(prospect._id.toString()))
      .map(prospect => ({
        prospectId: prospect._id,
        currentStep: 1,
        status: 'pending',
        nextSendAt: null
      }));

    campaign.prospects.push(...newProspects);
    await campaign.save();

    return Response.json({
      success: true,
      message: `Added ${newProspects.length} new prospects to campaign`,
      campaign
    });

  } catch (error) {
    console.error('Add prospects to campaign error:', error);
    return Response.json(
      { success: false, error: 'Failed to add prospects to campaign' },
      { status: 500 }
    );
  }
}
