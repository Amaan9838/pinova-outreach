// ─────────────────────────────────────────────────────────────────────────────
// app/api/cron/outreach-engine/route.js — Outreach Engine v2 Cron
//
// This is the ONLY cron job that controls Outreach Engine v2 email sending.
// It replaces: process-sequences, process-flows, ai-followups (all deleted).
//
// Runs every 5 minutes via Vercel cron.
// Picks up leads where nextActionAt <= now AND campaign.useV2Engine = true.
//
// PRD Reference: §3.2 (Cron Execution Model), §11 (Observability)
//
// DO NOT add scheduling logic here.
// All runtime behavior must go through outreachEngine.js → processLead()
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server';
import connectDB from '../../../../lib/mongodb.js';
import CampaignProspect from '../../../../models/CampaignProspect.js';
import Campaign from '../../../../models/Campaign.js';
import { CampaignProspectService } from '../../../../lib/services/CampaignProspectService.js';
import { processLead, repairCorruptedLeads } from '../../../../lib/outreachEngine.js';

export const maxDuration = 300; // Vercel Pro: max 5 minutes
export const dynamic = 'force-dynamic';

export async function GET() {
  const startTime = Date.now();
  console.log(`[outreach-engine-cron] Starting run at ${new Date().toISOString()}`);

  try {
    await connectDB();

    const now = new Date();
    const BATCH_SIZE = 50; // Process max 50 leads per tick to avoid timeout

    // Auto-activate scheduled v2 campaigns whose start time has arrived.
    const schedulableCampaigns = await Campaign.find({
      status: 'scheduled',
      useV2Engine: true,
      'scheduling.startDateTime': { $lte: now }
    }).select('_id status startedAt');

    let activatedCampaigns = 0;
    if (schedulableCampaigns.length > 0) {
      for (const scheduledCampaign of schedulableCampaigns) {
        scheduledCampaign.status = 'active';
        if (!scheduledCampaign.startedAt) {
          scheduledCampaign.startedAt = now;
        }
        await scheduledCampaign.save();

        const syncResult = await CampaignProspectService.syncProspectsWithCampaignStatus(
          scheduledCampaign._id.toString(),
          'active'
        );
        if (!syncResult.success) {
          console.warn(
            `[outreach-engine-cron] Failed to sync prospects for scheduled campaign ${scheduledCampaign._id}: ${syncResult.error}`
          );
          continue;
        }

        activatedCampaigns += 1;
        console.log(
          `[outreach-engine-cron] Activated scheduled campaign ${scheduledCampaign._id} and initialized ${syncResult.modified} prospects`
        );
      }
    }

    // ── Find all active v2 campaign IDs ──────────────────────────────────────
    // PRD §3.2 — Query: campaign.status = active AND campaign.useV2Engine = true
    const activeCampaignIds = await Campaign.find({
      status: 'active',
      useV2Engine: true
    }).select('_id').lean();
    const campaignIds = activeCampaignIds.map(c => c._id);

    if (campaignIds.length === 0) {
      console.log('[outreach-engine-cron] No active v2 campaigns. Done.');
      return NextResponse.json({
        processed: 0,
        activatedCampaigns,
        message: 'No active v2 campaigns'
      });
    }

    // ── Query: Leads due for processing (PRD §3.2) ───────────────────────────
    // Exclude locked leads (processingLock check handles stale locks inside processLead)
    const dueLeads = await CampaignProspect.find({
      campaign: { $in: campaignIds },
      nextActionAt: { $lte: now },
      stopFlag: false,
      processingLock: false,
      v2State: { $nin: ['bounced', 'failed', 'stopped'] }
    })
    .select('_id')
    .sort({ nextActionAt: 1 }) // Oldest-first for fairness
    .limit(BATCH_SIZE)
    .lean();

    console.log(`[outreach-engine-cron] Found ${dueLeads.length} leads to process`);

    let processed = 0;
    let errors = 0;

    // ── Process each lead sequentially (PRD §3.4 — no bulk bursts) ──────────
    for (const lead of dueLeads) {
      // Safety: bail if approaching Vercel timeout (leave 30s buffer)
      if (Date.now() - startTime > 270000) {
        console.warn('[outreach-engine-cron] Approaching timeout, stopping early');
        break;
      }

      try {
        await processLead(lead._id.toString());
        processed++;
      } catch (err) {
        errors++;
        console.error(`[outreach-engine-cron] Error processing lead ${lead._id}:`, err.message);
      }
    }

    // ── Self-healing: repair corrupted leads (PRD §11.4) ────────────────────
    // Run occasionally to catch leads that have stopped silently
    const repaired = await repairCorruptedLeads();
    if (repaired > 0) {
      console.warn(`[outreach-engine-cron] Repaired ${repaired} corrupted leads`);
    }

    const duration = Date.now() - startTime;
    console.log(`[outreach-engine-cron] Done. Processed: ${processed}, Errors: ${errors}, Repaired: ${repaired}, Duration: ${duration}ms`);

    return NextResponse.json({
      success: true,
      activatedCampaigns,
      processed,
      errors,
      repaired,
      durationMs: duration
    });

  } catch (err) {
    console.error('[outreach-engine-cron] Fatal error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
