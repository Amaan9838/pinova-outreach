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

export async function GET(req) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);

    // ── Date range filter ────────────────────────────────────
    const dateRange = searchParams.get('dateRange') || ''; // 7d, 14d, 30d, 90d, custom
    const customFrom = searchParams.get('from') || '';
    const customTo = searchParams.get('to') || '';

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sevenDaysAgo = new Date(todayStart);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Compute date window for filtering
    let dateFrom = null;
    let dateTo = null;
    if (dateRange === '7d') { dateFrom = new Date(todayStart); dateFrom.setDate(dateFrom.getDate() - 7); }
    else if (dateRange === '14d') { dateFrom = new Date(todayStart); dateFrom.setDate(dateFrom.getDate() - 14); }
    else if (dateRange === '30d') { dateFrom = new Date(todayStart); dateFrom.setDate(dateFrom.getDate() - 30); }
    else if (dateRange === '90d') { dateFrom = new Date(todayStart); dateFrom.setDate(dateFrom.getDate() - 90); }
    else if (dateRange === 'custom' && customFrom) {
      dateFrom = new Date(customFrom);
      if (customTo) dateTo = new Date(customTo);
    }

    const dateFilter = {};
    if (dateFrom) dateFilter.$gte = dateFrom;
    if (dateTo) dateFilter.$lte = dateTo;
    const hasDateFilter = Object.keys(dateFilter).length > 0;
    const msgDateMatch = hasDateFilter ? { createdAt: dateFilter } : {};

    const [
      activeCampaigns,
      totalCampaigns,
      totalLeads,
      emailsSentToday,
      repliesTodayCP,
      totalEmailsSent,
      repliesTodayMsg,
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
      // Outbound messages that received replies today (repliedAt set by inbox-monitor)
      Message.countDocuments({
        repliedAt: { $gte: todayStart },
        status: 'replied',
        isTest: { $ne: true },
      }),
    ]);
    const repliesToday = Math.max(repliesTodayCP, repliesTodayMsg);

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

    // Get per-campaign sent counts from Message collection (with optional date filter)
    const sentMatchFilter = { campaignId: { $in: campaignIds }, status: { $in: ['sent', 'delivered', 'opened', 'replied'] }, isTest: { $ne: true }, ...msgDateMatch };
    const sentCounts = await Message.aggregate([
      { $match: sentMatchFilter },
      { $group: { _id: '$campaignId', count: { $sum: 1 } } },
    ]);
    const campaignSentMap = Object.fromEntries(sentCounts.map(s => [s._id.toString(), s.count]));

    // Get per-campaign reply counts — dual source for reliability
    // Source 1: CampaignProspect.repliedAt (set by stopAllSchedulingForProspect)
    const cpReplyFilter = { campaign: { $in: campaignIds }, repliedAt: { $ne: null } };
    if (hasDateFilter) cpReplyFilter.repliedAt = { ...cpReplyFilter.repliedAt, ...dateFilter };
    const cpReplyCounts = await CampaignProspect.aggregate([
      { $match: cpReplyFilter },
      { $group: { _id: '$campaign', count: { $sum: 1 } } },
    ]);
    const cpReplyMap = Object.fromEntries(cpReplyCounts.map(r => [r._id.toString(), r.count]));

    // Source 2: Outbound Messages that received a reply (repliedAt set by inbox-monitor line 296)
    // These are the original sent messages updated to status='replied' with repliedAt timestamp
    const msgReplyFilter = {
      campaignId: { $in: campaignIds },
      status: 'replied',
      repliedAt: { $ne: null },
      isTest: { $ne: true },
    };
    if (hasDateFilter) msgReplyFilter.repliedAt = { ...msgReplyFilter.repliedAt, ...dateFilter };
    const msgReplyCounts = await Message.aggregate([
      { $match: msgReplyFilter },
      // Group by prospect to avoid counting multiple messages from same prospect
      { $group: { _id: { campaign: '$campaignId', prospect: '$prospectId' } } },
      { $group: { _id: '$_id.campaign', count: { $sum: 1 } } },
    ]);
    const msgReplyMap = Object.fromEntries(msgReplyCounts.map(r => [r._id.toString(), r.count]));

    // Merge: take max of both sources per campaign
    const allCampaignIdStrs = [...new Set([...Object.keys(cpReplyMap), ...Object.keys(msgReplyMap)])];
    const replyMap = {};
    for (const id of allCampaignIdStrs) {
      replyMap[id] = Math.max(cpReplyMap[id] || 0, msgReplyMap[id] || 0);
    }

    // Get per-campaign max step count from emailSteps array
    const stepCounts = await CampaignProspect.aggregate([
      { $match: { campaign: { $in: campaignIds } } },
      { $group: {
        _id: '$campaign',
        maxSteps: { $max: { $size: { $ifNull: ['$emailSteps', []] } } },
      } },
    ]);
    const stepMap = Object.fromEntries(stepCounts.map(s => [s._id.toString(), s.maxSteps || 1]));

    const enrichedCampaigns = campaigns.map(c => {
      const id = c._id.toString();
      const leads = leadMap[id] || c.prospectCount || 0;
      const sent = campaignSentMap[id] || 0;
      const replies = replyMap[id] || 0;
      const totalSteps = stepMap[id] || 1;  // how many email steps (initial + follow-ups)
      const totalExpected = leads * totalSteps;  // total emails expected when campaign completes
      return {
        _id: id,
        name: c.name,
        status: c.status,
        leads,
        sent,
        replies,
        totalSteps,
        totalExpected,
        replyRate: sent > 0 ? Math.round((replies / sent) * 100) : 0,
        calls: 0,
      };
    });

    // ── Dynamic chart data (adapts to dateRange) ────────────
    const chartDays = dateRange === '14d' ? 14 : dateRange === '30d' ? 30 : dateRange === '90d' ? 90 : 7;
    const chartStart = new Date(todayStart);
    chartStart.setDate(chartStart.getDate() - chartDays);

    const dayLabels = [];
    const dayStarts = [];
    for (let i = chartDays - 1; i >= 0; i--) {
      const d = new Date(todayStart);
      d.setDate(d.getDate() - i);
      // Show shorter labels for larger ranges
      if (chartDays <= 7) {
        dayLabels.push(d.toLocaleDateString('en-US', { weekday: 'short' }));
      } else if (chartDays <= 14) {
        dayLabels.push(d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
      } else {
        dayLabels.push(d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
      }
      dayStarts.push(new Date(d));
    }

    const sentByDay = await Message.aggregate([
      {
        $match: {
          createdAt: { $gte: chartStart },
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

    const repliesByDayCP = await CampaignProspect.aggregate([
      {
        $match: {
          repliedAt: { $gte: chartStart, $ne: null },
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

    // Also count outbound messages that got replies, grouped by reply date
    const repliesByDayMsg = await Message.aggregate([
      {
        $match: {
          repliedAt: { $gte: chartStart, $ne: null },
          status: 'replied',
          isTest: { $ne: true },
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
    const cpReplyDayMap = Object.fromEntries(repliesByDayCP.map(r => [r._id, r.count]));
    const msgReplyDayMap = Object.fromEntries(repliesByDayMsg.map(r => [r._id, r.count]));
    // Merge: take max per day
    const allReplyDays = new Set([...Object.keys(cpReplyDayMap), ...Object.keys(msgReplyDayMap)]);
    const replyDayMap = {};
    for (const day of allReplyDays) {
      replyDayMap[day] = Math.max(cpReplyDayMap[day] || 0, msgReplyDayMap[day] || 0);
    }

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
