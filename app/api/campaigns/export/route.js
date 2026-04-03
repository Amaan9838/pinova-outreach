import dbConnect from '@/lib/mongodb';
import Campaign from '@/models/Campaign';
import CampaignProspect from '@/models/CampaignProspect';
import Prospect from '@/models/Prospect';
import Message from '@/models/Message';

export const dynamic = 'force-dynamic';

// ─── Helpers ──────────────────────────────────────────────────────────────
function escapeCsv(val) {
  const str = String(val ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function fmtDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleString('en-IN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
}

function stripHtml(html) {
  if (!html) return '';
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// ─── GET /api/campaigns/export ────────────────────────────────────────────
export async function GET(request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);

    const mode = searchParams.get('mode') || 'summary'; // summary | detail
    const campaignId = searchParams.get('campaignId') || '';
    const statusFilter = searchParams.get('status') || '';
    const engineFilter = searchParams.get('engine') || ''; // v2 | legacy
    const search = searchParams.get('search') || '';

    // ─────────────────────────────────────────────────────────────────────
    // DETAIL MODE — one row per prospect for a single campaign
    // ─────────────────────────────────────────────────────────────────────
    if (mode === 'detail' && campaignId) {
      const campaign = await Campaign.findById(campaignId).lean();
      if (!campaign) {
        return Response.json({ success: false, error: 'Campaign not found' }, { status: 404 });
      }

      const isV2 = !!campaign.useV2Engine;

      // Get all prospects for this campaign
      const campaignProspects = await CampaignProspect.find({ campaign: campaignId })
        .populate('prospect')
        .lean();

      // Get ALL messages for this campaign, grouped by prospectId
      const allMessages = await Message.find({
        campaignId: campaign._id,
        isTest: { $ne: true },
      })
        .sort({ createdAt: 1 })
        .lean();

      // Group messages by prospect
      const messagesByProspect = {};
      for (const msg of allMessages) {
        const pid = msg.prospectId?.toString();
        if (!pid) continue;
        if (!messagesByProspect[pid]) messagesByProspect[pid] = [];
        messagesByProspect[pid].push(msg);
      }

      // Find max messages per prospect (for dynamic columns)
      let maxMsgs = 0;
      for (const pid of Object.keys(messagesByProspect)) {
        if (messagesByProspect[pid].length > maxMsgs) maxMsgs = messagesByProspect[pid].length;
      }

      // Build headers
      const baseHeaders = [
        'S.No', 'First Name', 'Last Name', 'Email', 'Company', 'Position',
        'Phone', 'Website', 'Industry',
        'Status', 'Engine',
        isV2 ? 'V2 State' : null,
        'Current Step', 'Emails Sent',
        isV2 ? 'Reply Category' : null,
        'Replied At', 'Last Sent At', 'Last Opened At',
        'Started At', 'Completed At',
      ].filter(Boolean);

      const msgHeaders = [];
      for (let i = 1; i <= maxMsgs; i++) {
        msgHeaders.push(
          `Email ${i} Subject`,
          `Email ${i} Body`,
          `Email ${i} Status`,
          `Email ${i} Sent At`,
          `Email ${i} Opened At`,
          `Email ${i} Replied At`,
        );
      }

      const allHeaders = [...baseHeaders, ...msgHeaders];

      // Build rows
      const rows = campaignProspects.map((cp, idx) => {
        const prospect = cp.prospect || {};
        const pid = prospect._id?.toString() || cp.prospect?.toString();
        const msgs = messagesByProspect[pid] || [];
        const currentStep = isV2
          ? (cp.attemptCount || 0)
          : (cp.sequenceStep || 0);

        // For legacy campaigns, use counter fields; for v2, count from messages
        const emailsSentCount = isV2
          ? msgs.filter(m => m.status === 'sent' || m.status === 'delivered' || m.status === 'opened').length
          : (cp.emailsSent || msgs.filter(m => m.status !== 'failed').length);

        const row = [
          idx + 1,
          prospect.firstName || '',
          prospect.lastName || '',
          prospect.email || '',
          prospect.company || '',
          prospect.position || '',
          prospect.phone || '',
          prospect.website || '',
          prospect.industry || '',
          (cp.status || '').toUpperCase(),
          isV2 ? 'V2' : 'LEGACY',
        ];

        if (isV2) row.push(cp.v2State || '');

        row.push(
          currentStep,
          emailsSentCount,
        );

        if (isV2) row.push(cp.replyCategory || '');

        row.push(
          fmtDate(cp.repliedAt),
          fmtDate(cp.lastSentAt),
          fmtDate(cp.lastOpenedAt),
          fmtDate(cp.startedAt),
          fmtDate(cp.completedAt),
        );

        // Add message columns
        for (const msg of msgs) {
          row.push(
            msg.subject || '',
            stripHtml(msg.content || ''),
            (msg.status || '').toUpperCase(),
            fmtDate(msg.sentAt || msg.createdAt),
            fmtDate(msg.openedAt),
            fmtDate(msg.repliedAt),
          );
        }

        return row;
      });

      // Build CSV
      const csvLines = [
        allHeaders.map(escapeCsv).join(','),
        ...rows.map(row => row.map(escapeCsv).join(',')),
      ];
      const csvContent = csvLines.join('\r\n');

      const safeName = (campaign.name || 'campaign').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 40);
      const filename = `Campaign_${safeName}_Detail_${new Date().toISOString().slice(0, 10)}.csv`;

      return new Response(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Cache-Control': 'no-store',
        },
      });
    }

    // ─────────────────────────────────────────────────────────────────────
    // SUMMARY MODE — one row per campaign
    // ─────────────────────────────────────────────────────────────────────
    const filter = {};
    if (statusFilter) filter.status = statusFilter;
    if (engineFilter === 'v2') filter.useV2Engine = true;
    if (engineFilter === 'legacy') filter.useV2Engine = { $ne: true };
    if (search) {
      filter.name = { $regex: search, $options: 'i' };
    }

    const campaigns = await Campaign.find(filter).sort({ createdAt: -1 }).lean();

    const headers = [
      'S.No', 'Campaign Name', 'Status', 'Engine', 'Persona', 'Goal',
      'Total Prospects', 'Active', 'Replied', 'Bounced', 'Completed', 'Stopped', 'Failed',
      'Total Emails Sent', 'Total Opens', 'Total Replies',
      'Reply Rate %', 'Open Rate %',
      'Created At', 'Started At', 'Uses V2 Engine',
    ];

    const rows = await Promise.all(campaigns.map(async (c, idx) => {
      // Count prospects by status
      const prospectCounts = await CampaignProspect.aggregate([
        { $match: { campaign: c._id } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]);
      const counts = {};
      let totalProspects = 0;
      for (const s of prospectCounts) {
        counts[s._id] = s.count;
        totalProspects += s.count;
      }

      // Count messages
      const msgStats = await Message.aggregate([
        { $match: { campaignId: c._id, isTest: { $ne: true } } },
        {
          $group: {
            _id: null,
            totalSent: {
              $sum: {
                $cond: [{ $in: ['$status', ['sent', 'delivered', 'opened', 'replied']] }, 1, 0],
              },
            },
            totalOpens: {
              $sum: { $cond: [{ $ne: ['$openedAt', null] }, 1, 0] },
            },
            totalReplies: {
              $sum: { $cond: [{ $ne: ['$repliedAt', null] }, 1, 0] },
            },
          },
        },
      ]);

      const ms = msgStats[0] || { totalSent: 0, totalOpens: 0, totalReplies: 0 };

      // Fallback for legacy campaigns — use embedded counters on CampaignProspect
      let totalSent = ms.totalSent;
      let totalOpens = ms.totalOpens;
      let totalReplies = ms.totalReplies;

      // If no Messages found, try legacy aggregate from CampaignProspect counters
      if (totalSent === 0 && !c.useV2Engine) {
        const legacyStats = await CampaignProspect.aggregate([
          { $match: { campaign: c._id } },
          {
            $group: {
              _id: null,
              sent: { $sum: { $ifNull: ['$emailsSent', 0] } },
              opens: { $sum: { $ifNull: ['$emailsOpened', 0] } },
              replies: { $sum: { $cond: [{ $ne: ['$repliedAt', null] }, 1, 0] } },
            },
          },
        ]);
        if (legacyStats[0]) {
          totalSent = legacyStats[0].sent || totalSent;
          totalOpens = legacyStats[0].opens || totalOpens;
          totalReplies = legacyStats[0].replies || totalReplies;
        }
      }

      const replyRate = totalSent > 0 ? ((totalReplies / totalSent) * 100).toFixed(1) : '0.0';
      const openRate = totalSent > 0 ? ((totalOpens / totalSent) * 100).toFixed(1) : '0.0';

      return [
        idx + 1,
        c.name || '',
        (c.status || '').toUpperCase(),
        c.useV2Engine ? 'V2' : 'LEGACY',
        c.persona || '',
        c.goal || '',
        totalProspects,
        counts['active'] || 0,
        counts['replied'] || 0,
        counts['bounced'] || 0,
        counts['completed'] || 0,
        counts['stopped'] || 0,
        counts['failed'] || 0,
        totalSent,
        totalOpens,
        totalReplies,
        replyRate,
        openRate,
        fmtDate(c.createdAt),
        fmtDate(c.startedAt),
        c.useV2Engine ? 'Yes' : 'No',
      ];
    }));

    const csvLines = [
      headers.map(escapeCsv).join(','),
      ...rows.map(row => row.map(escapeCsv).join(',')),
    ];
    const csvContent = csvLines.join('\r\n');

    const filename = `Campaigns_Summary_${new Date().toISOString().slice(0, 10)}.csv`;

    return new Response(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });

  } catch (error) {
    console.error('Campaign export error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}
