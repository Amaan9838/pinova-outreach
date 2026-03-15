import dbConnect from '@/lib/mongodb';
import Campaign from '@/models/Campaign';
import CampaignProspect from '@/models/CampaignProspect';
import Message from '@/models/Message';
import EngineLog from '@/models/EngineLog';
import Task from '@/models/Task';
import CrmActivity from '@/models/CrmActivity';
import LinkedInLead from '@/models/LinkedInLead';
import '@/models/Prospect';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await dbConnect();

    // ── Metrics ──────────────────────────────────────────────
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sevenDaysAgo = new Date(todayStart);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [
      activeCampaigns,
      totalCampaigns,
      totalLeads,
      emailsSentToday,
      repliesToday,
      totalEmailsSent,
    ] = await Promise.all([
      Campaign.countDocuments({ status: 'active' }),
      Campaign.countDocuments(),
      CampaignProspect.countDocuments(),
      Message.countDocuments({
        createdAt: { $gte: todayStart },
        status: { $in: ['sent', 'delivered', 'opened', 'replied'] },
        isTest: { $ne: true },
      }),
      CampaignProspect.countDocuments({
        repliedAt: { $gte: todayStart },
      }),
      Message.countDocuments({
        status: { $in: ['sent', 'delivered', 'opened', 'replied'] },
        isTest: { $ne: true },
      }),
    ]);

    // ── Campaigns table ─────────────────────────────────────
    const campaigns = await Campaign.find()
      .select('name status stats createdAt prospectCount')
      .sort({ createdAt: -1 })
      .lean();

    const campaignIds = campaigns.map(c => c._id);

    // Get per-campaign lead counts
    const leadCounts = await CampaignProspect.aggregate([
      { $match: { campaign: { $in: campaignIds } } },
      { $group: { _id: '$campaign', count: { $sum: 1 } } },
    ]);
    const leadMap = Object.fromEntries(leadCounts.map(l => [l._id.toString(), l.count]));

    // Get per-campaign sent counts from Message collection
    const sentCounts = await Message.aggregate([
      { $match: { campaignId: { $in: campaignIds }, status: { $in: ['sent', 'delivered', 'opened', 'replied'] }, isTest: { $ne: true } } },
      { $group: { _id: '$campaignId', count: { $sum: 1 } } },
    ]);
    const campaignSentMap = Object.fromEntries(sentCounts.map(s => [s._id.toString(), s.count]));

    // Get per-campaign reply counts from CampaignProspect statuses
    const replyCounts = await CampaignProspect.aggregate([
      { $match: { campaign: { $in: campaignIds }, status: 'replied' } },
      { $group: { _id: '$campaign', count: { $sum: 1 } } },
    ]);
    const replyMap = Object.fromEntries(replyCounts.map(r => [r._id.toString(), r.count]));

    const enrichedCampaigns = campaigns.map(c => {
      const id = c._id.toString();
      const leads = leadMap[id] || c.prospectCount || 0;
      const sent = campaignSentMap[id] || 0;
      const replies = replyMap[id] || 0;
      return {
        _id: id,
        name: c.name,
        status: c.status,
        leads,
        sent,
        replies,
        replyRate: sent > 0 ? Math.round((replies / sent) * 100) : 0,
        calls: 0,
      };
    });

    // ── 7-day chart data ────────────────────────────────────
    const dayLabels = [];
    const dayStarts = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(todayStart);
      d.setDate(d.getDate() - i);
      dayLabels.push(d.toLocaleDateString('en-US', { weekday: 'short' }));
      dayStarts.push(new Date(d));
    }

    const sentByDay = await Message.aggregate([
      {
        $match: {
          createdAt: { $gte: sevenDaysAgo },
          status: { $in: ['sent', 'delivered', 'opened', 'replied'] },
          isTest: { $ne: true },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
          },
          count: { $sum: 1 },
        },
      },
    ]);

    const repliesByDay = await CampaignProspect.aggregate([
      {
        $match: {
          repliedAt: { $gte: sevenDaysAgo },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$repliedAt' },
          },
          count: { $sum: 1 },
        },
      },
    ]);

    const sentMap = Object.fromEntries(sentByDay.map(s => [s._id, s.count]));
    const replyDayMap = Object.fromEntries(repliesByDay.map(r => [r._id, r.count]));

    const emailsSent7d = dayStarts.map(d => {
      const key = d.toISOString().split('T')[0];
      return sentMap[key] || 0;
    });
    const replies7d = dayStarts.map(d => {
      const key = d.toISOString().split('T')[0];
      return replyDayMap[key] || 0;
    });

    // ── Activity feed from EngineLog ────────────────────────
    const engineLogs = await EngineLog.find()
      .sort({ timestamp: -1 })
      .limit(30)
      .populate({ path: 'campaignId', select: 'name' })
      .populate({
        path: 'leadId',
        select: 'prospect',
        populate: { path: 'prospect', select: 'firstName lastName email' },
      })
      .lean();

    const actionLabels = {
      initial_send: 'sent initial email to',
      followup_send: 'sent follow-up to',
      reply_classified: 'classified reply from',
      objection_handled: 'handled objection from',
      cooling_triggered: 'entered cooling for',
      retry_scheduled: 'scheduled retry for',
      hard_stopped: 'stopped outreach to',
      skipped_rate_limit: 'rate-limited send for',
      skipped_business_hours: 'skipped (outside hours)',
      completed_no_steps: 'completed sequence for',
    };

    const activity = engineLogs.map(log => {
      const prospect = log.leadId?.prospect;
      const prospectName = prospect
        ? `${prospect.firstName || ''} ${prospect.lastName || ''}`.trim() || prospect.email
        : 'Unknown';
      const campaignName = log.campaignId?.name || 'Unknown Campaign';
      const time = new Date(log.timestamp).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });

      // Determine dot type for UI
      let dotType = 'c'; // campaign/email
      if (log.action?.includes('reply') || log.action?.includes('objection')) dotType = 'l';
      if (log.action?.includes('cooling') || log.action?.includes('stop')) dotType = 'k';

      return {
        time,
        text: actionLabels[log.action] || log.action || 'processed',
        bold: prospectName,
        campaign: campaignName,
        type: dotType,
        state: log.stateAfter,
      };
    });

    // ── Tasks (for dashboard widget) ────────────────────────
    const tasks = await Task.find().sort({ createdAt: -1 }).limit(50).lean();

    // ── LinkedIn follow-ups due today (auto tasks) ──────────
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);
    const followUps = await LinkedInLead.find({
      nextFollowUp: { $lte: endOfToday, $ne: null },
    }).select('firstName lastName owner nextFollowUp status').lean();

    const followUpTasks = followUps.map(f => ({
      _id: `fu_${f._id}`,
      title: `Follow up with ${f.firstName || ''} ${f.lastName || ''}`.trim(),
      owner: f.owner || 'Unknown',
      status: 'pending',
      dueDate: f.nextFollowUp,
      isFollowUp: true,
      leadId: f._id,
    }));

    // ── CRM User Activities ─────────────────────────────────
    const crmActivities = await CrmActivity.find()
      .sort({ timestamp: -1 })
      .limit(30)
      .lean();

    const userActivity = crmActivities.map(a => ({
      time: new Date(a.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
      date: new Date(a.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      user: a.user,
      text: `${a.user} ${a.action}`,
      bold: a.target,
      type: a.type,
    }));

    return Response.json({
      success: true,
      metrics: {
        activeCampaigns,
        totalCampaigns,
        totalLeads,
        totalEmailsSent,
        emailsSentToday,
        repliesToday,
        callsBooked: 0,
      },
      campaigns: enrichedCampaigns,
      chartData: {
        labels: dayLabels,
        emailsSent7d,
        replies7d,
      },
      activity,
      userActivity,
      tasks: tasks.map(t => ({
        _id: t._id.toString(),
        title: t.title,
        owner: t.owner,
        status: t.status,
        dueDate: t.dueDate,
        createdAt: t.createdAt,
      })),
      followUpTasks,
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('CRM Dashboard API error:', error);
    return Response.json(
      { success: false, error: 'Failed to fetch CRM dashboard data' },
      { status: 500 }
    );
  }
}
