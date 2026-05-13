import dbConnect from '@/lib/mongodb';
import Lead from '@/models/Lead';

export const dynamic = 'force-dynamic';

/* ── GET /api/crm/leads/[id] — Get single lead with timeline ── */
export async function GET(req, { params }) {
  try {
    await dbConnect();
    const { id } = await params;
    const lead = await Lead.findById(id).lean();
    if (!lead) return Response.json({ success: false, error: 'Lead not found' }, { status: 404 });

    // Sort timeline descending
    if (lead.timeline) {
      lead.timeline.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }

    return Response.json({ success: true, lead });
  } catch (error) {
    console.error('Lead get error:', error);
    return Response.json({ success: false, error: 'Failed to fetch lead' }, { status: 500 });
  }
}

/* ── PATCH /api/crm/leads/[id] — Update lead fields ────────── */
export async function PATCH(req, { params }) {
  try {
    await dbConnect();
    const { id } = await params;
    const body = await req.json();
    const user = req.headers.get('x-crm-user') || 'system';

    const lead = await Lead.findById(id);
    if (!lead) return Response.json({ success: false, error: 'Lead not found' }, { status: 404 });

    const oldStage = lead.pipelineStage;
    const oldHeat = lead.heatLevel;

    // Apply updates
    const allowedFields = [
      'firstName', 'lastName', 'email', 'phone', 'company', 'role', 'website',
      'linkedin', 'instagram', 'facebook', 'source', 'offerCategory', 'industry',
      'pipelineStage', 'heatLevel', 'intentLevel', 'relationshipStage',
      'engagementScore', 'buyingReadiness', 'dealValue', 'dealProbability',
      'buyingTimeline', 'closedReason', 'lastAction', 'nextAction',
      'nurtureStatus', 'hotPipelineStage', 'tags', 'priority', 'owner',
      'notes', 'followUpIntel',
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        lead[field] = body[field];
      }
    }

    // Auto-log stage changes to timeline
    if (body.pipelineStage && body.pipelineStage !== oldStage) {
      lead.timeline.push({
        type: 'stage_change',
        content: `Pipeline stage changed from "${oldStage}" to "${body.pipelineStage}"`,
        by: user,
        timestamp: new Date(),
      });
    }

    // Auto-log heat changes to timeline
    if (body.heatLevel && body.heatLevel !== oldHeat) {
      lead.timeline.push({
        type: 'heat_change',
        content: `Heat level changed from "${oldHeat}" to "${body.heatLevel}"`,
        by: user,
        timestamp: new Date(),
      });
    }

    lead.lastActivityAt = new Date();
    await lead.save();

    return Response.json({ success: true, lead });
  } catch (error) {
    console.error('Lead update error:', error);
    return Response.json({ success: false, error: error.message || 'Failed to update lead' }, { status: 500 });
  }
}

/* ── DELETE /api/crm/leads/[id] — Delete lead ──────────────── */
export async function DELETE(req, { params }) {
  try {
    await dbConnect();
    const { id } = await params;
    await Lead.findByIdAndDelete(id);
    return Response.json({ success: true });
  } catch (error) {
    console.error('Lead delete error:', error);
    return Response.json({ success: false, error: 'Failed to delete lead' }, { status: 500 });
  }
}
