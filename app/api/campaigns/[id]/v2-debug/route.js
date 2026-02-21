// ─────────────────────────────────────────────────────────────────────────────
// app/api/campaigns/[id]/v2-debug/route.js
//
// Lead Debug View — per PRD §10.6 and §11.2
// Returns full lead lifecycle for a given lead in a v2 campaign, including
// all EngineLog entries sorted newest-first.
//
// Used by: Campaign > Lead Detail debug panel in the frontend.
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server';
import connectDB from '../../../../../lib/mongodb.js';
import CampaignProspect from '../../../../../models/CampaignProspect.js';
import EngineLog from '../../../../../models/EngineLog.js';
import Message from '../../../../../models/Message.js';

export async function GET(req, { params }) {
  try {
    await connectDB();

    const { id: campaignId } = params;
    const { searchParams } = new URL(req.url);
    const leadId = searchParams.get('leadId');
    const limit = parseInt(searchParams.get('limit') || '50');

    if (!leadId) {
      return NextResponse.json({ error: 'leadId query param required' }, { status: 400 });
    }

    // Fetch lead with prospect data
    const lead = await CampaignProspect.findById(leadId)
      .populate('prospect', 'firstName lastName email company')
      .select('campaign v2State nextActionAt attemptCount failureCount stopFlag processingLock aiMemory repliedAt lastOpenedAt threadHeaderMessageId createdAt updatedAt prospect');

    if (!lead || lead.campaign?.toString() !== campaignId) {
      return NextResponse.json({ error: 'Lead not found in this campaign' }, { status: 404 });
    }

    // Fetch all EngineLog entries for this lead (PRD §11.2)
    const logs = await EngineLog.find({ leadId })
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean();

    // Fetch all messages (PRD §11.2)
    const messages = await Message.find({
      campaignId: lead.campaign,
      prospectId: lead.prospect?._id || lead.prospect
    })
      .sort({ createdAt: -1 })
      .limit(20)
      .select('subject status createdAt events errorMessage headerMessageId content')
      .lean();

    return NextResponse.json({
      lead: {
        id: lead._id,
        prospect: lead.prospect
          ? {
              id: lead.prospect._id,
              name: `${lead.prospect.firstName || ''} ${lead.prospect.lastName || ''}`.trim(),
              email: lead.prospect.email,
              company: lead.prospect.company || ''
            }
          : null,
        v2State:           lead.v2State,
        nextActionAt:      lead.nextActionAt,
        attemptCount:      lead.attemptCount,
        failureCount:      lead.failureCount,
        stopFlag:          lead.stopFlag,
        processingLock:    lead.processingLock,
        aiMemory:          lead.aiMemory,
        repliedAt:         lead.repliedAt,
        lastOpenedAt:      lead.lastOpenedAt,
        threadHeaderMessageId: lead.threadHeaderMessageId,
        createdAt:         lead.createdAt,
        updatedAt:         lead.updatedAt,
      },
      logs,
      messages
    });

  } catch (err) {
    console.error('[v2-debug] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
