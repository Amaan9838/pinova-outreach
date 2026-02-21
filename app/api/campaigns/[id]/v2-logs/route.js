// ─────────────────────────────────────────────────────────────────────────────
// app/api/campaigns/[id]/v2-logs/route.js
//
// Campaign-level Engine Log viewer (PRD §10.7, §11.2)
// Returns EngineLog entries for ALL leads in a campaign, sorted newest-first.
//
// Query params:
//   ?limit     - default 100, max 500
//   ?leadId    - filter by specific lead
//   ?action    - filter by action type
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server';
import connectDB from '../../../../../lib/mongodb.js';
import EngineLog from '../../../../../models/EngineLog.js';
import Campaign from '../../../../../models/Campaign.js';

export async function GET(req, { params }) {
  try {
    await connectDB();

    const { id: campaignId } = params;
    const { searchParams } = new URL(req.url);

    const limit  = Math.min(parseInt(searchParams.get('limit') || '100'), 500);
    const leadId = searchParams.get('leadId') || undefined;
    const action = searchParams.get('action') || undefined;

    // Verify campaign exists
    const campaign = await Campaign.findById(campaignId).select('useV2Engine name');
    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    // Build query
    const query = { campaignId };
    if (leadId) query.leadId = leadId;
    if (action) query.action = action;

    const logs = await EngineLog.find(query)
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean();

    return NextResponse.json({
      campaignId,
      campaignName: campaign.name,
      count: logs.length,
      logs
    });

  } catch (err) {
    console.error('[v2-logs] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
