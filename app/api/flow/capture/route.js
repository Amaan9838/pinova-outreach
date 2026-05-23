import dbConnect from '../../../../lib/mongodb.js';
import GtdItem from '../../../../models/GtdItem.js';

export const dynamic = 'force-dynamic';

/**
 * POST /api/flow/capture
 * Bulk capture — dump multiple thoughts into inbox at once.
 * Body: { thoughts: "line1\nline2\nline3" } or { items: ["thought1", "thought2"] }
 */
export async function POST(request) {
  try {
    await dbConnect();
    const body = await request.json();

    let texts = [];
    if (body.thoughts && typeof body.thoughts === 'string') {
      texts = body.thoughts.split('\n').map(l => l.trim()).filter(Boolean);
    } else if (body.items && Array.isArray(body.items)) {
      texts = body.items.map(t => (typeof t === 'string' ? t.trim() : t.text?.trim())).filter(Boolean);
    }

    if (texts.length === 0) {
      return Response.json({ success: false, error: 'No items to capture' }, { status: 400 });
    }

    const items = texts.map(text => ({ text, type: 'inbox' }));
    const created = await GtdItem.insertMany(items);

    return Response.json({
      success: true,
      captured: created.length,
      items: created,
    });
  } catch (error) {
    console.error('POST /api/flow/capture error:', error);
    return Response.json({ success: false, error: 'Failed to capture items' }, { status: 500 });
  }
}
