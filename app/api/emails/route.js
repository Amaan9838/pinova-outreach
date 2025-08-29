import dbConnect from '../../../lib/mongodb.js';
import Message from '../../../models/Message.js';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await dbConnect();
    
    const messages = await Message.find()
      .populate('prospectId', 'firstName lastName email company city')
      .populate('campaignId', 'name')
      .populate('mailboxId', 'fromName fromEmail')
      .sort({ createdAt: -1 })
      .limit(500); // Limit to recent 500 emails for performance
    
    return Response.json({
      success: true,
      messages
    }, {
      headers: { 'Cache-Control': 'no-store' }
    });

  } catch (error) {
    console.error('Get emails error:', error);
    return Response.json(
      { success: false, error: 'Failed to fetch emails' },
      { status: 500 }
    );
  }
}
