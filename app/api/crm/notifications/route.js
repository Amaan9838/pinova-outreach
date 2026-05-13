import dbConnect from '@/lib/mongodb';
import Notification from '@/models/Notification';
import Lead from '@/models/Lead';

export const dynamic = 'force-dynamic';

/* ── GET /api/crm/notifications — List notifications ─────── */
export async function GET(req) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const user = searchParams.get('user') || req.headers.get('x-crm-user') || '';
    const unreadOnly = searchParams.get('unread') === 'true';
    const limit = parseInt(searchParams.get('limit') || '30', 10);

    const filter = {};
    if (user) filter.forUser = user;
    if (unreadOnly) filter.read = false;

    const [notifications, unreadCount] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate({ path: 'leadId', select: 'firstName lastName company heatLevel pipelineStage' })
        .lean(),
      Notification.countDocuments({ ...(user ? { forUser: user } : {}), read: false }),
    ]);

    return Response.json({
      success: true,
      notifications,
      unreadCount,
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Notifications list error:', error);
    return Response.json({ success: false, error: 'Failed to fetch notifications' }, { status: 500 });
  }
}

/* ── PATCH /api/crm/notifications — Mark as read ─────────── */
export async function PATCH(req) {
  try {
    await dbConnect();
    const body = await req.json();

    if (body.markAllRead) {
      const user = body.user || '';
      const filter = user ? { forUser: user, read: false } : { read: false };
      await Notification.updateMany(filter, { $set: { read: true, readAt: new Date() } });
      return Response.json({ success: true });
    }

    if (body.id) {
      await Notification.findByIdAndUpdate(body.id, { read: true, readAt: new Date() });
      return Response.json({ success: true });
    }

    return Response.json({ success: false, error: 'Missing id or markAllRead' }, { status: 400 });
  } catch (error) {
    console.error('Notification patch error:', error);
    return Response.json({ success: false, error: 'Failed to update notification' }, { status: 500 });
  }
}

/* ── POST /api/crm/notifications — Generate notifications ── */
export async function POST(req) {
  try {
    await dbConnect();
    const now = new Date();
    const created = [];

    // 1. Follow-up Due — leads with overdue next actions
    const overdueLeads = await Lead.find({
      'nextAction.dueDate': { $lt: now, $ne: null },
      'nextAction.type': { $ne: 'none' },
    }).select('firstName lastName owner nextAction').lean();

    for (const lead of overdueLeads) {
      // Check if we already sent a notification for this lead today
      const existing = await Notification.findOne({
        type: 'follow_up_due',
        leadId: lead._id,
        createdAt: { $gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()) },
      });
      if (existing) continue;

      const n = await Notification.create({
        type: 'follow_up_due',
        title: 'Follow-up Overdue',
        message: `${lead.firstName} ${lead.lastName} — ${lead.nextAction.description || lead.nextAction.type}`,
        leadId: lead._id,
        priority: 'high',
        forUser: lead.nextAction.owner || lead.owner,
      });
      created.push(n);
    }

    // 2. Lead Cooling — warm/hot leads with no activity for 7+ days
    const coolingThreshold = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const coolingLeads = await Lead.find({
      heatLevel: { $in: ['warm', 'hot'] },
      lastActivityAt: { $lt: coolingThreshold },
      pipelineStage: { $nin: ['client', 'churned'] },
    }).select('firstName lastName owner heatLevel').lean();

    for (const lead of coolingLeads) {
      const existing = await Notification.findOne({
        type: 'lead_cooling',
        leadId: lead._id,
        createdAt: { $gte: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000) },
      });
      if (existing) continue;

      const n = await Notification.create({
        type: 'lead_cooling',
        title: `${lead.heatLevel === 'hot' ? '🔥' : '🌡️'} Lead Cooling Down`,
        message: `${lead.firstName} ${lead.lastName} — no activity in 7+ days`,
        leadId: lead._id,
        priority: lead.heatLevel === 'hot' ? 'urgent' : 'high',
        forUser: lead.owner,
      });
      created.push(n);
    }

    // 3. Deal Stalled — pipeline_opportunity with no activity for 14+ days
    const stalledThreshold = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const stalledLeads = await Lead.find({
      pipelineStage: 'pipeline_opportunity',
      lastActivityAt: { $lt: stalledThreshold },
    }).select('firstName lastName owner company').lean();

    for (const lead of stalledLeads) {
      const existing = await Notification.findOne({
        type: 'deal_stalled',
        leadId: lead._id,
        createdAt: { $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) },
      });
      if (existing) continue;

      const n = await Notification.create({
        type: 'deal_stalled',
        title: '⚠️ Deal Stalled',
        message: `${lead.firstName} ${lead.lastName} (${lead.company}) — no activity in 14+ days`,
        leadId: lead._id,
        priority: 'high',
        forUser: lead.owner,
      });
      created.push(n);
    }

    // Slack webhook delivery
    const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;
    if (slackWebhookUrl && created.length > 0) {
      try {
        const blocks = created.slice(0, 10).map(n => ({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*${n.title}*\n${n.message}${n.priority === 'urgent' ? ' 🚨' : ''}`,
          },
        }));
        await fetch(slackWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: `📢 ${created.length} new CRM notification${created.length > 1 ? 's' : ''}`,
            blocks: [
              { type: 'header', text: { type: 'plain_text', text: `📢 ${created.length} CRM Alert${created.length > 1 ? 's' : ''}` } },
              ...blocks,
            ],
          }),
        });
        // Mark Slack sent
        await Notification.updateMany(
          { _id: { $in: created.map(n => n._id) } },
          { $set: { slackSent: true } },
        );
      } catch (slackErr) {
        console.error('Slack webhook error:', slackErr.message);
      }
    }

    return Response.json({
      success: true,
      created: created.length,
      notifications: created,
    });
  } catch (error) {
    console.error('Notification generation error:', error);
    return Response.json({ success: false, error: 'Failed to generate notifications' }, { status: 500 });
  }
}
