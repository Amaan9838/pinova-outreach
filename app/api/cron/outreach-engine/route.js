// ─────────────────────────────────────────────────────────────────────────────
// app/api/cron/outreach-engine/route.js — Outreach Engine v2 Cron
//
// This is the ONLY cron job that controls Outreach Engine v2 email sending.
// It replaces: process-sequences, process-flows, ai-followups (all deleted).
//
// Runs every 5 minutes via Vercel cron.
// Picks up leads where nextActionAt <= now AND campaign.useV2Engine = true.
//
// SEND PACING: Adds randomized inter-send delays (v2SendPacing config)
// between processLead() calls to prevent burst sending patterns that
// damage email deliverability. With default 2-4 min gaps, ~2-3 leads
// are processed per cron run — matching industry best practices.
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

// ── Runtime limits ──────────────────────────────────────────────────────────
const MAX_RUNTIME_MS = 270_000;          // 4.5 minutes usable (leave 30s buffer)

// Batch cap: max leads to process per cron run
const DYNAMIC_BATCH = 100; // Process up to 100 leads per run (no sleeping = fast)


export async function GET() {
  const startTime = Date.now();
  console.log(`[outreach-engine-cron] Starting run at ${new Date().toISOString()}`);

  try {
    await connectDB();

    const now = new Date();

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
    .limit(DYNAMIC_BATCH)
    .lean();

    console.log(`[outreach-engine-cron] Found ${dueLeads.length} leads to process (batch cap: ${DYNAMIC_BATCH})`);

    let processed = 0;
    let errors = 0;

    // ── Process leads with human-like send pacing ─────────────────────────────
    // Industry standard (Instantly, Smartlead, Salesforge) uses 45-120s gaps
    // between sends to mimic human sending patterns. Burst sending triggers
    // ESP spam filters. The pacing naturally limits how many leads we process
    // per 5-min cron run (~2-3 with default 2-4 min gaps).
    for (let i = 0; i < dueLeads.length; i++) {
      const lead = dueLeads[i];

      // Safety: bail if approaching Vercel timeout
      if (Date.now() - startTime > MAX_RUNTIME_MS) {
        console.warn(`[outreach-engine-cron] Timeout approaching, stopping after ${processed} sends`);
        break;
      }

      try {
        await processLead(lead._id.toString());
        processed++;

        // ── Inter-send pacing delay (PRD §7.10) ────────────────────────────
        // Add randomized delay between sends to prevent burst patterns.
        // Only sleep if there are more leads to process and we have time.
        if (i < dueLeads.length - 1 && (Date.now() - startTime) < MAX_RUNTIME_MS - 30_000) {
          // Fetch campaign-specific pacing config for this lead
          const leadCampaignId = lead.campaign || lead.campaignId;
          let minGapMs = 120_000; // 2 min default
          let maxGapMs = 240_000; // 4 min default

          if (leadCampaignId) {
            try {
              const leadCampaign = await Campaign.findById(leadCampaignId).select('v2SendPacing').lean();
              if (leadCampaign?.v2SendPacing?.enabled !== false) {
                minGapMs = (leadCampaign.v2SendPacing?.minGapSeconds || 120) * 1000;
                maxGapMs = (leadCampaign.v2SendPacing?.maxGapSeconds || 240) * 1000;
              } else {
                minGapMs = 0; // Pacing disabled — no delay
                maxGapMs = 0;
              }
            } catch { /* Use defaults */ }
          }

          if (minGapMs > 0) {
            const delay = minGapMs + Math.random() * (maxGapMs - minGapMs);
            console.log(`[outreach-engine-cron] Pacing: waiting ${Math.round(delay / 1000)}s before next send`);
            await new Promise(r => setTimeout(r, delay));
          }
        }
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
