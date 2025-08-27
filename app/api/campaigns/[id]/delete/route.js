import dbConnect from '../../../../../lib/mongodb.js';
import Campaign from '../../../../../models/Campaign.js';
import Message from '../../../../../models/Message.js';

export async function DELETE(request, { params }) {
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

    // Optional: Delete associated messages
    await Message.deleteMany({ campaignId: id });

    // Delete the campaign
    await Campaign.findByIdAndDelete(id);

    return Response.json({
      success: true,
      message: 'Campaign and associated messages deleted successfully'
    });

  } catch (error) {
    console.error('Delete campaign error:', error);
    return Response.json(
      { success: false, error: 'Failed to delete campaign: ' + error.message },
      { status: 500 }
    );
  }
}
