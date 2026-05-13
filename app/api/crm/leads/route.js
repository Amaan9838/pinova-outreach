import dbConnect from '@/lib/mongodb';
import Lead from '@/models/Lead';

export const dynamic = 'force-dynamic';

/* ── GET /api/crm/leads — List leads with filters ─────────── */
export async function GET(req) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);

    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '25', 10);
    const skip = (page - 1) * limit;

    // Build filter
    const filter = {};
    const search = searchParams.get('search');
    const stage = searchParams.get('stage');
    const heat = searchParams.get('heat');
    const intent = searchParams.get('intent');
    const source = searchParams.get('source');
    const owner = searchParams.get('owner');
    const offer = searchParams.get('offer');
    const industry = searchParams.get('industry');
    const priority = searchParams.get('priority');
    const nurture = searchParams.get('nurture');
    const tag = searchParams.get('tag');
    const overdue = searchParams.get('overdue');

    if (search) {
      const regex = new RegExp(search, 'i');
      filter.$or = [
        { firstName: regex }, { lastName: regex },
        { email: regex }, { company: regex }, { tags: regex },
      ];
    }
    if (stage) filter.pipelineStage = stage;
    if (heat) filter.heatLevel = heat;
    if (intent) filter.intentLevel = intent;
    if (source) filter.source = source;
    if (owner) filter.owner = owner;
    if (offer) filter.offerCategory = offer;
    if (industry) filter.industry = industry;
    if (priority) filter.priority = priority;
    if (nurture) filter.nurtureStatus = nurture;
    if (tag) filter.tags = tag;
    if (overdue === 'true') {
      filter['nextAction.dueDate'] = { $lt: new Date(), $ne: null };
    }

    // Sort
    const sortParam = searchParams.get('sort') || '-lastActivityAt';
    const sortDir = sortParam.startsWith('-') ? -1 : 1;
    const sortField = sortParam.replace(/^-/, '');
    const sort = { [sortField]: sortDir };

    const [leads, total] = await Promise.all([
      Lead.find(filter)
        .select('-timeline')  // exclude timeline for list (it can be huge)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Lead.countDocuments(filter),
    ]);

    // Stats sidebar data
    const stageCounts = await Lead.aggregate([
      { $group: { _id: '$pipelineStage', count: { $sum: 1 } } },
    ]);
    const heatCounts = await Lead.aggregate([
      { $group: { _id: '$heatLevel', count: { $sum: 1 } } },
    ]);

    return Response.json({
      success: true,
      leads,
      pagination: {
        page, limit, total,
        totalPages: Math.ceil(total / limit),
      },
      stats: {
        total,
        stageCounts: Object.fromEntries(stageCounts.map(s => [s._id, s.count])),
        heatCounts: Object.fromEntries(heatCounts.map(h => [h._id, h.count])),
      },
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Leads list error:', error);
    return Response.json({ success: false, error: 'Failed to fetch leads' }, { status: 500 });
  }
}

/* ── POST /api/crm/leads — Create a new lead ──────────────── */
export async function POST(req) {
  try {
    await dbConnect();
    const body = await req.json();
    const user = req.headers.get('x-crm-user') || 'Unknown';

    const lead = await Lead.create({
      ...body,
      createdBy: user,
      owner: body.owner || user,
      timeline: [{
        type: 'note',
        content: `Lead created by ${user}`,
        by: user,
        timestamp: new Date(),
      }],
    });

    return Response.json({ success: true, lead }, { status: 201 });
  } catch (error) {
    console.error('Lead create error:', error);
    return Response.json({ success: false, error: error.message || 'Failed to create lead' }, { status: 500 });
  }
}
