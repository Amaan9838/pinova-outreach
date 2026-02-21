// ─────────────────────────────────────────────────────────────────────────────
// app/api/campaigns/[id]/v2-kick/route.js
//
// Dev-only diagnostic + fix endpoint.
// GET  → shows campaign status, useV2Engine, and all prospect states
// POST → force-resets nextActionAt=now and processingLock=false for ALL
//        non-terminal prospects in this campaign so the cron picks them up.
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server';
import connectDB from '../../../../../lib/mongodb.js';
import Campaign from '../../../../../models/Campaign.js';
import CampaignProspect from '../../../../../models/CampaignProspect.js';

// GET — diagnose: what's blocking the cron?
export async function GET(req, { params }) {
  await connectDB();
  const { id } = params;

  const campaign = await Campaign.findById(id)
    .select('name status useV2Engine mailbox mailboxIds v2Angles');

  if (!campaign) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
  }

  const prospects = await CampaignProspect.find({ campaign: id })
    .populate('prospect', 'name email')
    .select('v2State nextActionAt stopFlag processingLock attemptCount failureCount prospect');

  const now = new Date();

  const summary = {
    campaign: {
      id: campaign._id,
      name: campaign.name,
      status: campaign.status,
      useV2Engine: campaign.useV2Engine,
      mailbox: campaign.mailbox,
      mailboxIds: campaign.mailboxIds,
      anglesCount: campaign.v2Angles?.length ?? 0,
    },
    cronWillProcess: campaign.status === 'active' && campaign.useV2Engine === true,
    prospectCount: prospects.length,
    byState: {},
    blockedReasons: [],
    prospects: prospects.map(p => ({
      id: p._id,
      email: p.prospect?.email,
      v2State: p.v2State,
      nextActionAt: p.nextActionAt,
      nextActionAt_past: p.nextActionAt ? p.nextActionAt <= now : null,
      stopFlag: p.stopFlag,
      processingLock: p.processingLock,
      attemptCount: p.attemptCount,
    })),
  };

  // Count by state
  prospects.forEach(p => {
    summary.byState[p.v2State || 'null'] = (summary.byState[p.v2State || 'null'] || 0) + 1;
  });

  // Surface blocking reasons
  if (campaign.status !== 'active') {
    summary.blockedReasons.push(`Campaign status is "${campaign.status}", must be "active". Click Start in the header.`);
  }
  if (!campaign.useV2Engine) {
    summary.blockedReasons.push('useV2Engine is false. Enable it in the v2 Engine tab and Save.');
  }
  const dueProspects = prospects.filter(p =>
    p.nextActionAt && p.nextActionAt <= now &&
    !p.stopFlag && !p.processingLock &&
    !['bounced', 'failed', 'stopped'].includes(p.v2State)
  );
  if (dueProspects.length === 0 && campaign.status === 'active' && campaign.useV2Engine) {
    const noNextAction = prospects.filter(p => !p.nextActionAt);
    const futureNextAction = prospects.filter(p => p.nextActionAt && p.nextActionAt > now);
    const locked = prospects.filter(p => p.processingLock);
    const stopped = prospects.filter(p => p.stopFlag);
    if (noNextAction.length > 0)
      summary.blockedReasons.push(`${noNextAction.length} prospects have NO nextActionAt — POST to /v2-kick to fix.`);
    if (futureNextAction.length > 0)
      summary.blockedReasons.push(`${futureNextAction.length} prospects have nextActionAt in the FUTURE. Either wait or POST to /v2-kick.`);
    if (locked.length > 0)
      summary.blockedReasons.push(`${locked.length} prospects have processingLock=true (stuck). POST to /v2-kick to fix.`);
    if (stopped.length > 0)
      summary.blockedReasons.push(`${stopped.length} prospects have stopFlag=true (finished or bounced).`);
  }

  return NextResponse.json(summary, { status: 200 });
}

// POST — fix: reset nextActionAt=now and unlock all non-terminal prospects
export async function POST(req, { params }) {
  await connectDB();
  const { id } = params;

  const result = await CampaignProspect.updateMany(
    {
      campaign: id,
      v2State: { $nin: ['bounced', 'failed', 'stopped', 'replied', 'completed'] },
    },
    {
      $set: {
        nextActionAt: new Date(), // due immediately
        processingLock: false,
        stopFlag: false,
      },
    }
  );

  return NextResponse.json({
    success: true,
    message: `Reset ${result.modifiedCount} prospects. Hit /api/cron/outreach-engine now.`,
    modified: result.modifiedCount,
  });
}
