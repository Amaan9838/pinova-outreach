import dbConnect from '../../../../lib/mongodb.js';
import Message from '../../../../models/Message.js';
import Campaign from '../../../../models/Campaign.js';
import Prospect from '../../../../models/Prospect.js';

export async function GET(request, { params }) {
  try {
    await dbConnect();
    
    const conversationId = params.id;
    
    // For conversation details, we need prospect ID and campaign ID
    // The conversation ID format should be: prospectId-campaignId
    const [prospectId, campaignId] = conversationId.split('-');
    
    if (!prospectId || !campaignId) {
      return Response.json(
        { success: false, error: 'Invalid conversation ID format' },
        { status: 400 }
      );
    }

    // Get all messages for this prospect-campaign combination
    const messages = await Message.find({
      prospectId: prospectId,
      campaignId: campaignId
    })
    .populate('prospectId', 'firstName lastName email company city')
    .populate('campaignId', 'name status sequence')
    .populate('mailboxId', 'fromName fromEmail')
    .sort({ stepNumber: 1, createdAt: 1 });

    if (messages.length === 0) {
      return Response.json(
        { success: false, error: 'Conversation not found' },
        { status: 404 }
      );
    }

    // Build conversation object
    const conversation = {
      _id: conversationId,
      prospect: messages[0].prospectId,
      campaign: messages[0].campaignId,
      messageCount: messages.length,
      lastActivityAt: messages[messages.length - 1].createdAt,
      lastActivity: messages[messages.length - 1].status,
      currentStep: Math.max(...messages.map(m => m.stepNumber))
    };

    return Response.json({
      success: true,
      conversation,
      messages
    });

  } catch (error) {
    console.error('Get conversation details error:', error);
    return Response.json(
      { success: false, error: 'Failed to fetch conversation details' },
      { status: 500 }
    );
  }
}
