import connectDB from './mongodb.js';
import CampaignProspect from '../models/CampaignProspect.js';
import Campaign from '../models/Campaign.js';
import { CampaignProspectService } from './services/CampaignProspectService.js';
import { processLead, repairCorruptedLeads } from './outreachEngine.js';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function activateDueScheduledCampaigns(now) {
  const schedulableCampaigns = await Campaign.find({
    status: 'scheduled',
    useV2Engine: true,
    'scheduling.startDateTime': { $lte: now }
  }).select('_id status startedAt');

  let activatedCampaigns = 0;
  for (const scheduledCampaign of schedulableCampaigns) {
    scheduledCampaign.status = 'active';
    if (!scheduledCampaign.startedAt) scheduledCampaign.startedAt = now;
    await scheduledCampaign.save();

    const syncResult = await CampaignProspectService.syncProspectsWithCampaignStatus(
      scheduledCampaign._id.toString(),
      'active'
    );

    if (!syncResult.success) {
      console.warn(`[outreach-runner] Failed to sync scheduled campaign ${scheduledCampaign._id}: ${syncResult.error}`);
      continue;
    }

    activatedCampaigns += 1;
    console.log(`[outreach-runner] Activated scheduled campaign ${scheduledCampaign._id}`);
  }

  return activatedCampaigns;
}

async function getPacingMs(campaignId, defaultMinSeconds, defaultMaxSeconds) {
  let minGapMs = defaultMinSeconds * 1000;
  let maxGapMs = defaultMaxSeconds * 1000;

  if (campaignId) {
    const campaign = await Campaign.findById(campaignId).select('v2SendPacing').lean();
    if (campaign?.v2SendPacing?.enabled === false) {
      return 0;
    }
    minGapMs = (campaign?.v2SendPacing?.minGapSeconds || defaultMinSeconds) * 1000;
    maxGapMs = (campaign?.v2SendPacing?.maxGapSeconds || defaultMaxSeconds) * 1000;
  }

  if (maxGapMs < minGapMs) maxGapMs = minGapMs;
  return minGapMs + Math.random() * (maxGapMs - minGapMs);
}

export async function runOutreachEngineTick(options = {}) {
  const startedAt = Date.now();
  const maxRuntimeMs = options.maxRuntimeMs || 15 * 60 * 1000;
  const batchSize = options.batchSize || 100;
  const defaultMinGapSeconds = options.minGapSeconds ?? 120;
  const defaultMaxGapSeconds = options.maxGapSeconds ?? 240;

  await connectDB();
  const now = new Date();
  const activatedCampaigns = await activateDueScheduledCampaigns(now);

  const activeCampaignIds = await Campaign.find({
    status: 'active',
    useV2Engine: true
  }).select('_id').lean();
  const campaignIds = activeCampaignIds.map((campaign) => campaign._id);

  if (campaignIds.length === 0) {
    return { success: true, activatedCampaigns, processed: 0, errors: 0, repaired: 0, durationMs: Date.now() - startedAt };
  }

  const dueLeads = await CampaignProspect.find({
    campaign: { $in: campaignIds },
    nextActionAt: { $lte: now },
    stopFlag: false,
    processingLock: false,
    v2State: { $nin: ['bounced', 'failed', 'stopped'] }
  })
    .select('_id campaign')
    .sort({ nextActionAt: 1 })
    .limit(batchSize)
    .lean();

  let processed = 0;
  let errors = 0;

  for (let i = 0; i < dueLeads.length; i += 1) {
    if (Date.now() - startedAt > maxRuntimeMs) {
      console.warn(`[outreach-runner] Runtime limit reached after ${processed} leads`);
      break;
    }

    const lead = dueLeads[i];
    try {
      await processLead(lead._id.toString());
      processed += 1;
    } catch (error) {
      errors += 1;
      console.error(`[outreach-runner] Failed to process lead ${lead._id}:`, error.message);
    }

    if (i < dueLeads.length - 1) {
      const delay = await getPacingMs(lead.campaign, defaultMinGapSeconds, defaultMaxGapSeconds);
      if (delay > 0 && Date.now() - startedAt + delay < maxRuntimeMs) {
        console.log(`[outreach-runner] Pacing: waiting ${Math.round(delay / 1000)}s`);
        await sleep(delay);
      }
    }
  }

  const repaired = await repairCorruptedLeads();
  return {
    success: true,
    activatedCampaigns,
    processed,
    errors,
    repaired,
    durationMs: Date.now() - startedAt
  };
}
