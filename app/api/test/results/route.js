import dbConnect from '../../../../lib/mongodb.js';
import Message from '../../../../models/Message.js';

export async function GET() {
  try {
    await dbConnect();
    
    // Get test messages only
    const testMessages = await Message.find({ 
      isTest: true 
    })
    .populate('mailboxId', 'fromName fromEmail')
    .sort({ createdAt: -1 })
    .limit(20);

    // Add calculated stats
    const results = testMessages.map(msg => ({
      _id: msg._id,
      subject: msg.subject,
      toEmail: msg.content.match(/To: ([^\n]*)/)?.[1] || 'Test Email', // Extract from content or fallback
      status: msg.status,
      sentAt: msg.sentAt,
      createdAt: msg.createdAt,
      events: msg.events,
      mailbox: msg.mailboxId,
      trackingId: msg.trackingId,
      // Deliverability metrics
      wasOpened: msg.events?.some(e => e.type === 'opened') || false,
      wasClicked: msg.events?.some(e => e.type === 'clicked') || false,
      wasReplied: msg.events?.some(e => e.type === 'replied') || false,
      wasBounced: msg.events?.some(e => e.type === 'bounced') || false,
      openTime: msg.events?.find(e => e.type === 'opened')?.timestamp,
      replyTime: msg.events?.find(e => e.type === 'replied')?.timestamp
    }));
    
    return Response.json({
      success: true,
      results,
      summary: {
        total: results.length,
        sent: results.filter(r => r.status === 'sent').length,
        delivered: results.filter(r => r.status === 'delivered' || r.status === 'sent').length,
        opened: results.filter(r => r.wasOpened).length,
        clicked: results.filter(r => r.wasClicked).length,
        replied: results.filter(r => r.wasReplied).length,
        bounced: results.filter(r => r.wasBounced).length,
        failed: results.filter(r => r.status === 'failed').length
      }
    });

  } catch (error) {
    console.error('Get test results error:', error);
    return Response.json(
      { success: false, error: 'Failed to fetch test results' },
      { status: 500 }
    );
  }
}
