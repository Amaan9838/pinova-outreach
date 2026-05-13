import dbConnect from '@/lib/mongodb';
import Lead from '@/models/Lead';

export const dynamic = 'force-dynamic';

/* ── GET /api/crm/leads/[id]/timeline — Paginated timeline ── */
export async function GET(req, { params }) {
  try {
    await dbConnect();
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '30', 10);

    const lead = await Lead.findById(id).select('timeline').lean();
    if (!lead) return Response.json({ success: false, error: 'Lead not found' }, { status: 404 });

    const sorted = (lead.timeline || []).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    const total = sorted.length;
    const entries = sorted.slice((page - 1) * limit, page * limit);

    return Response.json({
      success: true,
      entries,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Timeline get error:', error);
    return Response.json({ success: false, error: 'Failed to fetch timeline' }, { status: 500 });
  }
}

/* ── POST /api/crm/leads/[id]/timeline — Add timeline entry ─ */
export async function POST(req, { params }) {
  try {
    await dbConnect();
    const { id } = await params;
    const body = await req.json();
    const user = req.headers.get('x-crm-user') || 'Unknown';

    const lead = await Lead.findById(id);
    if (!lead) return Response.json({ success: false, error: 'Lead not found' }, { status: 404 });

    const entry = {
      type: body.type || 'note',
      content: body.content || '',
      by: user,
      channel: body.channel || '',
      sentiment: body.sentiment || '',
      metadata: body.metadata || {},
      timestamp: new Date(),
    };

    lead.timeline.push(entry);

    // Update last action
    lead.lastAction = {
      type: entry.type === 'note' ? 'task' : entry.type === 'call' ? 'call' : 'email',
      description: entry.content.slice(0, 100),
      date: new Date(),
      by: user,
    };
    lead.lastActivityAt = new Date();

    await lead.save();

    return Response.json({ success: true, entry, timeline: lead.timeline });
  } catch (error) {
    console.error('Timeline add error:', error);
    return Response.json({ success: false, error: 'Failed to add timeline entry' }, { status: 500 });
  }
}
