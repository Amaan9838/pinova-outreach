// ─────────────────────────────────────────────────────────────────────────────
// app/api/internal/process-lead/[leadId]/route.js
//
// Internal debug endpoint — manually trigger processLead() for a single lead.
// Used for: debugging, testing, IMAP reply immediate trigger.
//
// PRD Reference: §9.5 (Engine Trigger Endpoint)
//
// SECURITY: Must require internal authentication.
// NOT exposed publicly.
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server';
import { processLead } from '../../../../../lib/outreachEngine.js';

const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET || process.env.CRON_SECRET;

export async function POST(req, { params }) {
  // Authentication (PRD §9.5 — must require internal auth)
  const authHeader = req.headers.get('authorization');
  if (!INTERNAL_SECRET || authHeader !== `Bearer ${INTERNAL_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { leadId } = params;

  if (!leadId || leadId.length < 10) {
    return NextResponse.json({ error: 'Invalid leadId' }, { status: 400 });
  }

  try {
    console.log(`[internal/process-lead] Manually triggering processLead for ${leadId}`);
    await processLead(leadId);
    return NextResponse.json({ success: true, leadId, message: 'processLead() executed' });
  } catch (err) {
    console.error(`[internal/process-lead] Error for ${leadId}:`, err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
