import dbConnect from '../../../../lib/mongodb.js';
import Message from '../../../../models/Message.js';
import Campaign from '../../../../models/Campaign.js';

export async function POST(request) {
  try {
    await dbConnect();
    
    const body = await request.json();
    console.log('Delivery webhook received:', body);
    
    // Handle different webhook types (AWS SES, SendGrid, etc.)
    if (body.eventType === 'delivery' || body.Type === 'Notification') {
      await handleDelivery(body);
    } else if (body.eventType === 'bounce') {
      await handleBounce(body);
    }

    return Response.json({ success: true });

  } catch (error) {
    console.error('Delivery webhook error:', error);
    return Response.json({ success: true }); // Always return success to webhook
  }
}

async function handleDelivery(webhookData) {
  try {
    // Extract message ID from webhook (depends on provider format)
    const messageId = webhookData.messageId || webhookData.Message?.messageId;
    
    if (!messageId) {
      console.log('No message ID in delivery webhook');
      return;
    }

    // Find message by SES message ID
    const message = await Message.findOne({ sesMessageId: messageId });
    
    if (message) {
      console.log(`Marking message ${message._id} as delivered`);
      
      message.events.push({
        type: 'delivered',
        timestamp: new Date(),
        data: webhookData
      });
      
      message.status = 'delivered';
      message.deliveredAt = new Date();
      await message.save();

      // Update campaign stats if applicable
      if (message.campaignId) {
        const campaign = await Campaign.findById(message.campaignId);
        if (campaign) {
          campaign.stats.delivered += 1;
          await campaign.save();
        }
      }
    }
    
  } catch (error) {
    console.error('Handle delivery error:', error);
  }
}

async function handleBounce(webhookData) {
  try {
    const messageId = webhookData.messageId || webhookData.Message?.messageId;
    
    const message = await Message.findOne({ sesMessageId: messageId });
    
    if (message) {
      console.log(`Marking message ${message._id} as bounced`);
      
      message.events.push({
        type: 'bounced',
        timestamp: new Date(),
        data: webhookData
      });
      
      message.status = 'bounced';
      await message.save();

      // Update campaign stats
      if (message.campaignId) {
        const campaign = await Campaign.findById(message.campaignId);
        if (campaign) {
          campaign.stats.bounced += 1;
          await campaign.save();
        }
      }
    }
    
  } catch (error) {
    console.error('Handle bounce error:', error);
  }
}
