import dbConnect from '../../../lib/mongodb.js';
import Campaign from '../../../models/Campaign.js';
import Prospect from '../../../models/Prospect.js';
import Message from '../../../models/Message.js';
import Mailbox from '../../../models/MailboxFixed.js';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await dbConnect();

    // Get campaign stats
    const totalCampaigns = await Campaign.countDocuments();
    const activeCampaigns = await Campaign.countDocuments({ status: 'active' });

    // Get prospect stats
    const totalProspects = await Prospect.countDocuments();
    const activeProspects = await Prospect.countDocuments({ status: 'active' });

    // Get message stats
    const totalSent = await Message.countDocuments({ status: { $in: ['sent', 'delivered'] } });
    const totalDelivered = await Message.countDocuments({ status: 'delivered' });
    const totalOpened = await Message.countDocuments({ 
      'events.type': 'opened' 
    });
    const totalReplied = await Message.countDocuments({ 
      'events.type': 'replied' 
    });

    // Get mailbox stats
    const totalMailboxes = await Mailbox.countDocuments();
    const activeMailboxes = await Mailbox.countDocuments({ status: 'active' });

    // Get recent activity
    const recentMessages = await Message.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('prospectId', 'firstName lastName email')
      .populate('campaignId', 'name');

    const recentActivity = recentMessages.map(message => {
      const latestEvent = message.events[message.events.length - 1];
      return {
        type: latestEvent?.type || 'sent',
        message: `${latestEvent?.type || 'Sent'} to ${message.prospectId?.firstName} ${message.prospectId?.lastName} in campaign "${message.campaignId?.name}"`,
        timestamp: new Date(latestEvent?.timestamp || message.createdAt).toLocaleString()
      };
    });

    const stats = {
      campaigns: {
        total: totalCampaigns,
        active: activeCampaigns
      },
      prospects: {
        total: totalProspects,
        active: activeProspects
      },
      messages: {
        sent: totalSent,
        delivered: totalDelivered,
        opened: totalOpened,
        replied: totalReplied
      },
      mailboxes: {
        total: totalMailboxes,
        active: activeMailboxes
      }
    };

    return Response.json({
      success: true,
      stats,
      recentActivity
    }, { headers: { 'Cache-Control': 'no-store' } });

  } catch (error) {
    console.error('Dashboard API error:', error);
    return Response.json(
      { success: false, error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}
