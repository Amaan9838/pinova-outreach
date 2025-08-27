import dbConnect from '../../../../lib/mongodb.js';
import Message from '../../../../models/Message.js';

export async function GET(request, { params }) {
  try {
    await dbConnect();
    
    const { id } = params;
    
    const message = await Message.findById(id)
      .populate('prospectId', 'firstName lastName email company city')
      .populate('campaignId', 'name')
      .populate('mailboxId', 'fromName fromEmail');
    
    if (!message) {
      return Response.json(
        { success: false, error: 'Email not found' },
        { status: 404 }
      );
    }
    
    return Response.json({
      success: true,
      message
    });

  } catch (error) {
    console.error('Get email details error:', error);
    return Response.json(
      { success: false, error: 'Failed to fetch email details' },
      { status: 500 }
    );
  }
}
