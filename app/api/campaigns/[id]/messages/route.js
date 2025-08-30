import dbConnect from '../../../../../lib/mongodb.js';
import Message from '../../../../../models/Message.js';
// Ensure referenced models are registered before populate
import '../../../../../models/Prospect.js';
import '../../../../../models/MailboxFixed.js';

export async function GET(request, { params }) {
  try {
    await dbConnect();
    
    const { id } = params;
    
    const messages = await Message.find({ campaignId: id })
      .populate('prospectId', 'firstName lastName email')
      .populate('mailboxId', 'fromName fromEmail')
      .sort({ createdAt: -1 })
      .limit(50);
    
    return Response.json({
      success: true,
      messages
    });

  } catch (error) {
    console.error('Get campaign messages error:', error);
    return Response.json(
      { success: false, error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}
