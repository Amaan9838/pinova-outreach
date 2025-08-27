import dbConnect from '../../../../lib/mongodb.js';
import Campaign from '../../../../models/Campaign.js';

export async function GET(request, { params }) {
  try {
    await dbConnect();
    
    const { id } = params;
    
    const campaign = await Campaign.findById(id)
      .populate('mailboxes', 'fromName fromEmail status dailyCap')
      .populate('prospects.prospectId', 'firstName lastName email company city');
    
    if (!campaign) {
      return Response.json(
        { success: false, error: 'Campaign not found' },
        { status: 404 }
      );
    }
    
    return Response.json({
      success: true,
      campaign
    });

  } catch (error) {
    console.error('Get campaign error:', error);
    return Response.json(
      { success: false, error: 'Failed to fetch campaign' },
      { status: 500 }
    );
  }
}
