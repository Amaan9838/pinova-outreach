import dbConnect from '../../../../lib/mongodb.js';
import GtdItem from '../../../../models/GtdItem.js';

export const dynamic = 'force-dynamic';

/**
 * GET /api/flow/items
 * Get GTD items with optional filters: ?type=action&area=outbound&energy=low&isToday=true
 */
export async function GET(request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);

    const filter = { completedAt: null };

    const type = searchParams.get('type');
    if (type) filter.type = type;

    const area = searchParams.get('area');
    if (area) filter.area = area;

    const energy = searchParams.get('energy');
    if (energy) filter.energy = energy;

    const isToday = searchParams.get('isToday');
    if (isToday === 'true') filter.isToday = true;

    const projectId = searchParams.get('projectId');
    if (projectId) filter.projectId = projectId;

    // Include completed items if explicitly requested
    const includeDone = searchParams.get('includeDone');
    if (includeDone === 'true') delete filter.completedAt;

    // Special: get ALL items (for FlowOS UI full load)
    const all = searchParams.get('all');
    if (all === 'true') {
      delete filter.completedAt;
      delete filter.type;
    }

    const items = await GtdItem.find(filter).sort({ createdAt: -1 }).lean();

    return Response.json({ success: true, items });
  } catch (error) {
    console.error('GET /api/flow/items error:', error);
    return Response.json({ success: false, error: 'Failed to fetch items' }, { status: 500 });
  }
}

/**
 * POST /api/flow/items
 * Create one or more GTD items.
 * Body: { item: {...} } or { items: [{...}, ...] }
 */
export async function POST(request) {
  try {
    await dbConnect();
    const body = await request.json();

    if (body.items && Array.isArray(body.items)) {
      const created = await GtdItem.insertMany(body.items);
      return Response.json({ success: true, items: created });
    }

    const item = body.item || body;
    const created = await GtdItem.create(item);
    return Response.json({ success: true, item: created });
  } catch (error) {
    console.error('POST /api/flow/items error:', error);
    return Response.json({ success: false, error: 'Failed to create item' }, { status: 500 });
  }
}
