import dbConnect from '@/lib/mongodb';
import Lead from '@/models/Lead';

export const dynamic = 'force-dynamic';

/* ── GET /api/crm/leads/stats — Pipeline & heat stats ─────── */
export async function GET() {
  try {
    await dbConnect();
    const now = new Date();

    const [
      total,
      stageCounts,
      heatCounts,
      intentCounts,
      sourceCounts,
      overdueActions,
      hotLeads,
      recentlyActive,
      totalDealValue,
      avgDealProbability,
      ownerCounts,
    ] = await Promise.all([
      Lead.countDocuments(),

      Lead.aggregate([
        { $group: { _id: '$pipelineStage', count: { $sum: 1 }, value: { $sum: '$dealValue' } } },
        { $sort: { _id: 1 } },
      ]),

      Lead.aggregate([
        { $group: { _id: '$heatLevel', count: { $sum: 1 } } },
      ]),

      Lead.aggregate([
        { $group: { _id: '$intentLevel', count: { $sum: 1 } } },
      ]),

      Lead.aggregate([
        { $group: { _id: '$source', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),

      Lead.countDocuments({
        'nextAction.dueDate': { $lt: now, $ne: null },
        'nextAction.type': { $ne: 'none' },
      }),

      Lead.countDocuments({ heatLevel: 'hot' }),

      Lead.countDocuments({
        lastActivityAt: { $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) },
      }),

      Lead.aggregate([
        { $group: { _id: null, total: { $sum: '$dealValue' } } },
      ]),

      Lead.aggregate([
        { $match: { dealProbability: { $gt: 0 } } },
        { $group: { _id: null, avg: { $avg: '$dealProbability' } } },
      ]),

      Lead.aggregate([
        { $group: { _id: '$owner', count: { $sum: 1 } } },
      ]),
    ]);

    return Response.json({
      success: true,
      stats: {
        total,
        stageCounts: Object.fromEntries(stageCounts.map(s => [s._id, { count: s.count, value: s.value }])),
        heatCounts: Object.fromEntries(heatCounts.map(h => [h._id, h.count])),
        intentCounts: Object.fromEntries(intentCounts.map(i => [i._id, i.count])),
        sourceCounts: Object.fromEntries(sourceCounts.map(s => [s._id, s.count])),
        ownerCounts: Object.fromEntries(ownerCounts.map(o => [o._id, o.count])),
        overdueActions,
        hotLeads,
        recentlyActive,
        totalDealValue: totalDealValue[0]?.total || 0,
        avgDealProbability: Math.round(avgDealProbability[0]?.avg || 0),
      },
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Lead stats error:', error);
    return Response.json({ success: false, error: 'Failed to fetch stats' }, { status: 500 });
  }
}
