// ─────────────────────────────────────────────────────────────────────────────
// lib/outreachEngine.js — Outreach Engine v2 Core
//
// THIS IS THE SOLE RUNTIME AUTHORITY FOR ALL OUTREACH DECISIONS.
// DO NOT add scheduling logic anywhere else.
// All state transitions must pass through processLead().
//
// PRD Reference: §0 (Architecture Rules), §3 (Scheduling), §4 (State Machine),
//                §5 (Angle Rotation), §6 (AI Layer), §7 (Email Sending),
//                §11 (Observability)
// ─────────────────────────────────────────────────────────────────────────────

import { toZonedTime, fromZonedTime, format } from 'date-fns-tz';
import { addHours, addDays, addMinutes, setHours, startOfDay } from 'date-fns';
import connectDB from './mongodb.js';
import Campaign from '../models/Campaign.js';
import CampaignProspect from '../models/CampaignProspect.js';
import Message from '../models/Message.js';
import EngineLog from '../models/EngineLog.js';
import CrmActivity from '../models/CrmActivity.js';
import { SMTPService } from './smtp.js';
import { generateTargetedEmail, classifyReply, generateReplyResponse } from './aiService.js';
import { buildTrackingUrl } from './tracking.js';

// ─────────────────────────────────────────────────────────────────────────────
// Constants (PRD §4.4, §11.9)
// ─────────────────────────────────────────────────────────────────────────────
const TERMINAL_STATES = ['bounced', 'failed', 'stopped'];
const LOCK_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes — PRD §11.9

// ── v2State → legacy status mapping (mirrors CampaignProspect pre-save hook) ─
// Used to keep `status` in sync when using findByIdAndUpdate (bypasses hooks).
const V2_STATE_TO_STATUS = {
  'new': 'pending', 'contacted': 'active', 'opened': 'active',
  'replied_positive': 'replied', 'replied_neutral': 'replied',
  'replied_objection': 'replied', 'bounced': 'bounced',
  'completed': 'completed', 'failed': 'failed', 'stopped': 'stopped'
};
function mapV2Status(v2State) { return V2_STATE_TO_STATUS[v2State] ?? 'active'; }

const DEFAULT_BUSINESS_DAYS = [1, 2, 3, 4, 5]; // Monday-Friday

function getCampaignTimezone(campaign) {
  return campaign?.v2Timezone || campaign?.scheduling?.timezone || 'America/New_York';
}

function getCampaignBusinessHours(campaign) {
  const fallbackStart = 9;
  const fallbackEnd = 17;

  const legacyStart = campaign?.scheduling?.businessHours?.startTime;
  const legacyEnd = campaign?.scheduling?.businessHours?.endTime;

  const startHour = Number.isFinite(campaign?.v2BusinessHours?.startHour)
    ? campaign.v2BusinessHours.startHour
    : legacyStart
      ? Number.parseInt(legacyStart.split(':')[0], 10)
      : fallbackStart;

  const endHour = Number.isFinite(campaign?.v2BusinessHours?.endHour)
    ? campaign.v2BusinessHours.endHour
    : legacyEnd
      ? Number.parseInt(legacyEnd.split(':')[0], 10)
      : fallbackEnd;

  return {
    startHour: Number.isFinite(startHour) ? startHour : fallbackStart,
    endHour: Number.isFinite(endHour) ? endHour : fallbackEnd
  };
}

function getAllowedBusinessDays(campaign) {
  const configuredDays = campaign?.scheduling?.businessHours?.daysOfWeek;
  if (!Array.isArray(configuredDays) || configuredDays.length === 0) {
    return DEFAULT_BUSINESS_DAYS;
  }

  const normalized = configuredDays
    .map((day) => Number.parseInt(day, 10))
    .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6);

  return normalized.length > 0 ? normalized : DEFAULT_BUSINESS_DAYS;
}

function shouldEnforceBusinessHours(campaign) {
  return campaign?.scheduling?.businessHours?.enabled !== false;
}

// ─────────────────────────────────────────────────────────────────────────────
// § 3.5 — Escalation tier mapping (PRD §5.5)
// ─────────────────────────────────────────────────────────────────────────────
function getEscalationLevel(attemptCount) {
  if (attemptCount <= 1) return 1; // soft_intro
  if (attemptCount === 2) return 2; // value_reinforcement
  if (attemptCount === 3) return 3; // angle_shift
  if (attemptCount === 4) return 4; // direct_clarity
  return 5;                          // final_nudge
}

// ─────────────────────────────────────────────────────────────────────────────
// §3.2, §3.3, §3.5, §3.9 — Timing calculator
// Computes the next UTC DateTime for an action, enforcing:
//   - Exponential delay formula (PRD §3.5)
//   - Business hours enforcement (PRD §3.3)
//   - Weekend skip (PRD §3.3)
//   - Always returns a future UTC timestamp
// ─────────────────────────────────────────────────────────────────────────────
export function calculateNextActionAt(campaign, attemptCount, openStatus = false) {
  const {
    baseDelayHours,
    escalationMultiplier,
    coolingPeriodDays,
    maxAttemptsPerCycle
  } = campaign.v2Delays;

  const timezone = getCampaignTimezone(campaign);
  const { startHour, endHour } = getCampaignBusinessHours(campaign);
  const allowedDays = getAllowedBusinessDays(campaign);
  const enforceBusinessWindow = shouldEnforceBusinessHours(campaign);

  let delayHours;

  // If cooling cycle triggered (PRD §3.7)
  if (attemptCount >= maxAttemptsPerCycle) {
    return addDays(new Date(), coolingPeriodDays);
  }

  // SPECIAL CASE: Initial send (attemptCount = 0)
  // Send ASAP within current business day if possible, don't wait 24h
  if (attemptCount === 0) {
    let baseTime = new Date();
    
    // Check if there is a scheduled start date in the future
    if (campaign?.scheduling?.startDateTime) {
      const scheduledStart = new Date(campaign.scheduling.startDateTime);
      if (scheduledStart > baseTime) {
        baseTime = scheduledStart;
      }
    }

    if (!enforceBusinessWindow) {
      return baseTime;
    }
    // Return next valid business hour using the evaluated base window calculation
    return enforceBusinessHours(baseTime, timezone, startHour, endHour, allowedDays);
  }

  // PRD §3.5 — Formula-based widening delay (for follow-ups only)
  delayHours = baseDelayHours * Math.pow(escalationMultiplier, Math.max(0, attemptCount - 1));
  delayHours = Math.max(24, delayHours); // Never below 24h (PRD §3.5)

  // PRD §3.6 — Shorten slightly if lead opened (but never < 24h)
  if (openStatus && delayHours > 24) {
    delayHours = Math.max(24, delayHours * 0.75);
  }

  // Compute candidate UTC time (for follow-up sends)
  let candidateUtc = addHours(new Date(), delayHours);

  // Enforce business hours (PRD §3.3): convert to campaign timezone and check
  if (enforceBusinessWindow) {
    candidateUtc = enforceBusinessHours(candidateUtc, timezone, startHour, endHour, allowedDays);
  }

  return candidateUtc;
}

// ─────────────────────────────────────────────────────────────────────────────
// §3.3 — Business hours + weekend enforcement
// Converts UTC → campaign timezone, checks if inside business window.
// If outside, rolls to next valid business day at startHour.
// ─────────────────────────────────────────────────────────────────────────────
function enforceBusinessHours(utcDate, timezone, startHour, endHour, allowedDays = DEFAULT_BUSINESS_DAYS) {
  // Convert UTC → campaign local time
  const local = toZonedTime(utcDate, timezone);
  const localHour = local.getHours();
  const safeDays = Array.isArray(allowedDays) && allowedDays.length > 0
    ? allowedDays
    : DEFAULT_BUSINESS_DAYS;

  let adjustedLocal = local;

  const moveToNextAllowedDay = (sourceDate, includeToday) => {
    let candidate = startOfDay(sourceDate);
    if (!includeToday) {
      candidate = addDays(candidate, 1);
    }

    let guard = 0;
    while (!safeDays.includes(candidate.getDay()) && guard < 14) {
      candidate = addDays(candidate, 1);
      guard += 1;
    }

    candidate = setHours(candidate, startHour);
    candidate.setMinutes(0, 0, 0);
    return candidate;
  };

  // Check if selected day is not allowed by configured business days.
  if (!safeDays.includes(adjustedLocal.getDay())) {
    adjustedLocal = moveToNextAllowedDay(adjustedLocal, true);
    return fromZonedTime(adjustedLocal, timezone);
  }

  // Too early in the day
  if (localHour < startHour) {
    adjustedLocal = setHours(adjustedLocal, startHour);
    adjustedLocal.setMinutes(0, 0, 0);
    return fromZonedTime(adjustedLocal, timezone);
  }

  // Too late in the day — roll to next business day
  if (localHour >= endHour) {
    adjustedLocal = moveToNextAllowedDay(adjustedLocal, false);
    return fromZonedTime(adjustedLocal, timezone);
  }

  // Inside business hours — return as-is
  return fromZonedTime(adjustedLocal, timezone);
}

// ─────────────────────────────────────────────────────────────────────────────
// §3.8 — Exponential retry backoff for SMTP failures
// retryDelay = min(2^failureCount * 10 minutes, 24 hours)
// ─────────────────────────────────────────────────────────────────────────────
function calculateRetryBackoff(failureCount) {
  const delayMs = Math.pow(2, failureCount) * 10 * 60 * 1000;
  const capMs = 24 * 60 * 60 * 1000;
  return addMinutes(new Date(), Math.min(delayMs, capMs) / 60000);
}

// ─────────────────────────────────────────────────────────────────────────────
// §7.3 — Rate limiting check for mailbox (hourly + daily hard caps)
// Returns null if OK, or a future Date to reschedule to if limit exceeded.
//
// NOTE: Inter-send pacing (min-gap) is enforced at the cron loop level via
// an actual sleep() between sends, not here. This function only checks
// hard hourly/daily caps via Message document counts.
// ─────────────────────────────────────────────────────────────────────────────
async function checkMailboxRateLimits(campaign, mailbox) {
  const now = new Date();
  const limits = campaign.v2Limits;

  // Check hourly send count (PRD §3.4)
  const oneHourAgo = new Date(now - 60 * 60 * 1000);
  const hourlySentCount = await Message.countDocuments({
    mailboxId: mailbox._id,
    createdAt: { $gte: oneHourAgo },
    status: 'sent'
  });
  if (hourlySentCount >= (limits.hourlySendLimit || 10)) {
    console.log(`[v2Engine] Hourly limit hit for mailbox ${mailbox._id}`);
    return addHours(now, 1);
  }

  // Check daily send count (PRD §3.4)
  const campaignTimezone = getCampaignTimezone(campaign);
  const startOfToday = startOfDay(toZonedTime(now, campaignTimezone));
  const startOfTodayUtc = fromZonedTime(startOfToday, campaignTimezone);
  const dailySentCount = await Message.countDocuments({
    mailboxId: mailbox._id,
    createdAt: { $gte: startOfTodayUtc },
    status: 'sent'
  });
  if (dailySentCount >= (limits.dailySendLimit || 40)) {
    console.log(`[v2Engine] Daily limit hit for mailbox ${mailbox._id}`);
    // Schedule for next business day
    return calculateNextActionAt(campaign, 999); // 999 = cooling trigger
  }

  return null; // All checks pass — OK to send
}

function getProspectIdFromLead(lead) {
  if (!lead?.prospect) return null;
  if (typeof lead.prospect === 'object' && lead.prospect._id) {
    return lead.prospect._id;
  }
  return lead.prospect;
}

function getEventDataValue(data, key) {
  if (!data) return null;
  if (typeof data.get === 'function') {
    return data.get(key);
  }
  return data[key];
}

function extractLatestReplyText(messages) {
  for (const message of messages) {
    if (message?.status === 'replied' && typeof message.content === 'string' && message.content.trim()) {
      return message.content.trim();
    }

    const events = Array.isArray(message?.events) ? [...message.events] : [];
    events.sort((a, b) => new Date(b?.timestamp || 0) - new Date(a?.timestamp || 0));

    for (const event of events) {
      if (event?.type !== 'replied') continue;

      const text = getEventDataValue(event.data, 'text');
      const html = getEventDataValue(event.data, 'html');
      const candidate = (typeof text === 'string' && text.trim())
        ? text
        : (typeof html === 'string' ? html : '');

      if (candidate.trim()) {
        return candidate.trim();
      }
    }
  }

  return '';
}

async function fetchRecentLeadMessages(lead, limit = 5) {
  const prospectId = getProspectIdFromLead(lead);
  if (!prospectId) return [];

  return Message.find({
    campaignId: lead.campaign._id,
    prospectId
  })
    .sort({ createdAt: -1 })
    .limit(limit);
}

function calculateReplyThreadFollowUpAt(campaign, lead, messages = [], fallbackDate = new Date()) {
  const repliedAt = lead.repliedAt ? new Date(lead.repliedAt) : fallbackDate;
  const latestOutboundAfterReply = messages
    .filter((message) => message?.status === 'sent')
    .map((message) => message.createdAt || message.sentAt)
    .filter(Boolean)
    .map((date) => new Date(date))
    .filter((date) => !Number.isNaN(date.getTime()) && date >= repliedAt)
    .sort((a, b) => b.getTime() - a.getTime())[0];

  const anchorDate = latestOutboundAfterReply || repliedAt || fallbackDate;
  let nextAt = addHours(anchorDate, 24);

  if (shouldEnforceBusinessHours(campaign)) {
    const timezone = getCampaignTimezone(campaign);
    const { startHour, endHour } = getCampaignBusinessHours(campaign);
    nextAt = enforceBusinessHours(
      nextAt,
      timezone,
      startHour,
      endHour,
      getAllowedBusinessDays(campaign)
    );
  }

  return nextAt;
}

// ─────────────────────────────────────────────────────────────────────────────
// §3.13, §4.7 — MAIN ENGINE: processLead()
//
// This is the exclusive function that may change state / scheduling.
// No other code may mutate nextActionAt, v2State, attemptCount, or failureCount.
//
// Execution flow:
//   1. Pre-flight checks (lock, terminal state, campaign status)
//   2. Business hours check
//   3. Rate limit check
//   4. Reply classification (if repliedAt set)
//   5. Email generation + send
//   6. State transition
//   7. Schedule next action
//   8. Log everything
// ─────────────────────────────────────────────────────────────────────────────
export async function processLead(leadId) {
  await connectDB();

  // ── Fetch lead ──────────────────────────────────────────────────────────────
  const lead = await CampaignProspect.findById(leadId).populate('campaign');
  if (!lead) {
    console.warn(`[v2Engine] Lead not found: ${leadId}`);
    return;
  }

  const campaign = lead.campaign;
  if (!campaign || !campaign.useV2Engine) {
    console.warn(`[v2Engine] Campaign not v2: ${campaign?._id}`);
    return;
  }

  // ── Pre-flight: Terminal state guard (PRD §4.4) ─────────────────────────────
  if (lead.stopFlag || TERMINAL_STATES.includes(lead.v2State)) {
    console.log(`[v2Engine] Lead ${leadId} is terminal (${lead.v2State}). Skipping.`);
    return;
  }

  // ── Pre-flight: Campaign active check (PRD §4.8) ───────────────────────────
  if (campaign.status !== 'active') {
    console.log(`[v2Engine] Campaign ${campaign._id} not active (${campaign.status}). Skipping.`);
    return;
  }

  // ── Pre-flight: Lock check (PRD §11.9) ─────────────────────────────────────
  if (lead.processingLock) {
    // Check for stale lock (older than 10 minutes)
    const lockAge = Date.now() - new Date(lead.processingStartedAt || 0).getTime();
    if (lockAge < LOCK_TIMEOUT_MS) {
      console.log(`[v2Engine] Lead ${leadId} is locked. Age: ${Math.round(lockAge / 1000)}s. Skipping.`);
      return;
    }
    // Stale lock — repair (PRD §11.9)
    console.warn(`[v2Engine] Stale lock detected for lead ${leadId}. Resetting.`);
  }

  // ── Acquire lock ────────────────────────────────────────────────────────────
  const stateBefore = lead.v2State;
  lead.processingLock = true;
  lead.processingStartedAt = new Date();
  await CampaignProspect.findByIdAndUpdate(leadId, {
    processingLock: true,
    processingStartedAt: new Date()
  });

  const logData = {
    campaignId: campaign._id,
    leadId: lead._id,
    stateBefore,
    nextActionAtBefore: lead.nextActionAt,
    attemptCountBefore: lead.attemptCount,
    failureCount: lead.failureCount
  };

  try {
    // ── Fetch prospect data (leaf node data model) ────────────────────────────
    const prospect = await lead.populate('prospect');

    // ── Multi-mailbox pool resolution (PRD §7.10) ──────────────────────────────
    // Priority: 1) lead.assignedMailbox (sticky)  2) round-robin from campaign.mailboxes[]
    //           3) legacy campaign.mailbox / options.selectedMailbox (backward compat)
    const Mailbox = (await import('../models/MailboxFixed.js')).default;

    let mailbox = null;
    let mailboxId = lead.assignedMailbox || null;

    // If lead already has a sticky mailbox assignment, use it
    if (mailboxId) {
      mailbox = await Mailbox.findById(mailboxId);
      if (mailbox && mailbox.status === 'active') {
        console.log(`[v2Engine] Using sticky assigned mailbox ${mailbox.fromEmail} for lead ${leadId}`);
      } else {
        // Assigned mailbox is gone or inactive — fall through to pool
        console.warn(`[v2Engine] Assigned mailbox ${mailboxId} inactive/missing for lead ${leadId}. Reassigning from pool.`);
        mailbox = null;
        mailboxId = null;
      }
    }

    // If no valid sticky mailbox, pick from campaign mailbox pool
    if (!mailbox) {
      const mailboxPool = (campaign.mailboxes && campaign.mailboxes.length > 0)
        ? campaign.mailboxes
        : [campaign.mailbox, campaign.options?.selectedMailbox].filter(Boolean);

      if (mailboxPool.length === 0) {
        await releaseLead(leadId, lead.nextActionAt);
        await writeLog({ ...logData, stateAfter: stateBefore || 'new', action: 'skipped_mailbox_inactive', error: 'No mailbox configured on campaign (set one in Options tab)' });
        console.warn(`[v2Engine] Campaign ${campaign._id} has no mailbox configured. Skipping lead ${leadId}.`);
        return;
      }

      // Round-robin: use attemptCount + lead index as rotation key
      const rotationIndex = (lead.attemptCount || 0) % mailboxPool.length;
      mailboxId = mailboxPool[rotationIndex];

      // Try each mailbox in pool until we find an active one
      for (let i = 0; i < mailboxPool.length; i++) {
        const candidateId = mailboxPool[(rotationIndex + i) % mailboxPool.length];
        const candidateMailbox = await Mailbox.findById(candidateId);
        if (candidateMailbox && candidateMailbox.status === 'active') {
          mailbox = candidateMailbox;
          mailboxId = candidateId;
          break;
        }
      }

      if (!mailbox) {
        await releaseLead(leadId, lead.nextActionAt);
        await writeLog({ ...logData, stateAfter: stateBefore || 'new', action: 'skipped_mailbox_inactive', error: 'All mailboxes in pool inactive or not found' });
        console.warn(`[v2Engine] All mailboxes inactive for campaign ${campaign._id}. Skipping lead ${leadId}.`);
        return;
      }

      // Persist sticky assignment for thread integrity
      await CampaignProspect.findByIdAndUpdate(leadId, { assignedMailbox: mailbox._id });
      console.log(`[v2Engine] Assigned mailbox ${mailbox.fromEmail} to lead ${leadId} (pool rotation)`);
    }

    // ── Business hours check (PRD §3.3) ──────────────────────────────────────
    // Skip in development — IST morning hours would block Pacific-timezone campaigns
    const isProd = process.env.NODE_ENV === 'production';
    const now = new Date();
    const timezone = getCampaignTimezone(campaign);
    const { startHour, endHour } = getCampaignBusinessHours(campaign);
    const allowedDays = getAllowedBusinessDays(campaign);
    const enforceBusinessWindow = shouldEnforceBusinessHours(campaign);
    const hasPendingReply = lead.repliedAt && !lead.v2State?.startsWith('replied_');

    if (isProd && enforceBusinessWindow && !hasPendingReply) {
      const localNow = toZonedTime(now, timezone);
      const localHour = localNow.getHours();
      const isAllowedDay = allowedDays.includes(localNow.getDay());

      if (!isAllowedDay || localHour < startHour || localHour >= endHour) {
        const nextAt = enforceBusinessHours(addMinutes(now, 1), timezone, startHour, endHour, allowedDays);
        await CampaignProspect.findByIdAndUpdate(leadId, { nextActionAt: nextAt, processingLock: false });
        await writeLog({ ...logData, stateAfter: stateBefore || 'new', action: 'skipped_business_hours', nextActionAtAfter: nextAt });
        return;
      }
    } else if (!isProd) {
      console.log(`[v2Engine] Dev mode — skipping business hours check for lead ${leadId}`);
    }

    // ── Rate limit check (PRD §3.4, §3.10) ───────────────────────────────────
    if (!hasPendingReply) {
      const rateLimitDelay = await checkMailboxRateLimits(campaign, mailbox);
      if (rateLimitDelay) {
        await CampaignProspect.findByIdAndUpdate(leadId, { nextActionAt: rateLimitDelay, processingLock: false });
        await writeLog({ ...logData, stateAfter: stateBefore || 'new', action: 'skipped_rate_limit', nextActionAtAfter: rateLimitDelay });
        return;
      }
    }

    // ── REPLY CLASSIFICATION BRANCH (PRD §4.5, §6.6, §8.4) ──────────────────
    // IMAP sets repliedAt = now. processLead() handles the classification.
    if (hasPendingReply) {
      const messages = await fetchRecentLeadMessages(lead, 8);
      const rawReply = extractLatestReplyText(messages);
      const convHistory = messages
        .filter((m) => m?.status === 'sent' || m?.status === 'delivered' || m?.status === 'opened')
        .slice(0, 5)
        .map((m) => ({ subject: m.subject, body: m.content || '' }));

      if (!rawReply) {
        const retryAt = addMinutes(new Date(), 5);
        await CampaignProspect.findByIdAndUpdate(leadId, {
          processingLock: false,
          nextActionAt: retryAt
        });
        await writeLog({
          ...logData,
          stateAfter: stateBefore || 'contacted',
          action: 'retry_scheduled',
          error: 'Reply detected but no reply text was found to classify',
          errorCategory: 'reply_ingestion_missing',
          nextActionAtAfter: retryAt
        });
        return;
      }

      let classification;
      try {
        classification = await classifyReply({
          rawReply,
          conversationHistory: convHistory,
          campaignGoal: campaign.goal
        });
      } catch (aiErr) {
        // AI failed — retry once then mark failure
        try {
          classification = await classifyReply({ rawReply, conversationHistory: convHistory, campaignGoal: campaign.goal });
        } catch {
          const newFailureCount = (lead.failureCount || 0) + 1;
          const nextAt = calculateRetryBackoff(newFailureCount);
          await CampaignProspect.findByIdAndUpdate(leadId, {
            failureCount: newFailureCount,
            nextActionAt: nextAt,
            processingLock: false
          });
          await writeLog({ ...logData, stateAfter: stateBefore, action: 'retry_scheduled', error: 'AI classification failed twice', errorCategory: 'ai_classification_failure', nextActionAtAfter: nextAt, failureCount: newFailureCount });
          return;
        }
      }

      const { intent, objectionType, summary } = classification;

      // Apply classification to aiMemory (PRD §6.9)
      const aiMemoryUpdate = {
        'aiMemory.sentiment': intent,
        'aiMemory.objectionType': objectionType || null,
        'aiMemory.replySummary': summary || null
      };

      // State transition based on intent (PRD §4.3)
      let newState, nextActionAt;
      if (intent === 'positive') {
        newState = 'replied_positive';
        nextActionAt = calculateReplyThreadFollowUpAt(campaign, lead, messages);
      } else if (intent === 'neutral') {
        newState = 'replied_neutral';
        nextActionAt = calculateReplyThreadFollowUpAt(campaign, lead, messages);
      } else if (intent === 'objection') {
        newState = 'replied_objection';
        nextActionAt = calculateReplyThreadFollowUpAt(campaign, lead, messages);
        if (objectionType) aiMemoryUpdate['aiMemory.objectionType'] = objectionType;
      } else if (intent === 'stop') {
        // PRD §6.8 — Unsubscribe handling
        newState = 'stopped';
        nextActionAt = null;
        await CampaignProspect.findByIdAndUpdate(leadId, {
          v2State: 'stopped', stopFlag: true, nextActionAt: null, processingLock: false, ...aiMemoryUpdate
        });
        await writeLog({ ...logData, stateAfter: 'stopped', action: 'hard_stopped', replyIntent: 'stop', nextActionAtAfter: null });
        return;
      } else {
        newState = 'replied_neutral';
        nextActionAt = calculateReplyThreadFollowUpAt(campaign, lead, messages);
      }

      // ── AUTO-SEND REPLY for positive / objection intents (PRD §6.7) ─────────
      const enableAiReply = process.env.AUTO_REPLY_TO_PROSPECTS === 'true';
      if (enableAiReply && (intent === 'positive' || intent === 'objection')) {
        let replyEmail;
        try {
          const prospectDoc = lead.prospect
            ? (typeof lead.prospect === 'object' ? lead.prospect : await (await import('../models/Prospect.js')).default.findById(lead.prospect))
            : null;

          replyEmail = await generateReplyResponse({
            intent,
            objectionType: objectionType || null,
            replySummary: summary || rawReply.slice(0, 300),
            knowledgeBase: campaign.knowledgeBase || '',
            campaignGoal: campaign.goal || '',
            lead: {
              name: prospectDoc ? `${prospectDoc.firstName || ''} ${prospectDoc.lastName || ''}`.trim() : '',
              company: prospectDoc?.company || ''
            }
          });
        } catch (replyAiErr) {
          console.error('[v2Engine] generateReplyResponse failed:', replyAiErr.message);
          // Non-fatal — fall through, still save state
        }

        if (replyEmail?.subject && replyEmail?.body) {
          const generatedTrackingId = `${lead._id.toString()}-${Date.now()}`;
          let replySendResult;
          try {
            replySendResult = await SMTPService.sendEmail({
              mailbox,
              to: typeof lead.prospect === 'object' ? lead.prospect.email : lead.prospect,
              subject: replyEmail.subject,
              html: `<p>${replyEmail.body.replace(/\n/g, '<br>')}</p>`,
              text: replyEmail.body,
              trackingId: generatedTrackingId,
              inReplyTo: lead.threadHeaderMessageId || null,
              references: lead.threadHeaderMessageId ? [lead.threadHeaderMessageId] : []
            });
          } catch (smtpErr) {
            replySendResult = { success: false, error: smtpErr.message };
          }

          if (replySendResult?.success) {
            // Update mailbox daily sent metrics (auto-resets if day changed)
            await Mailbox.incrementDailySent(mailbox._id);

            await Message.create({
              prospectId: typeof lead.prospect === 'object' ? lead.prospect._id : lead.prospect,
              campaignId: campaign._id,
              mailboxId: mailbox._id,
              trackingId: generatedTrackingId,
              subject: replyEmail.subject,
              content: replyEmail.body,
              headerMessageId: replySendResult.headerMessageId || replySendResult.messageId,
              status: 'sent',
              events: [{ type: 'sent', timestamp: new Date() }]
            });
            // Reply was sent — keep watching the thread and follow up only if no one emails again for 24h.
            newState = intent === 'positive' ? 'replied_positive' : 'replied_objection';
            nextActionAt = calculateReplyThreadFollowUpAt(
              campaign,
              lead,
              [{ status: 'sent', createdAt: new Date() }, ...messages]
            );
            await writeLog({
              ...logData,
              stateAfter: newState,
              action: 'ai_reply_sent',
              replyIntent: intent,
              replyObjectionType: objectionType || null,
              nextActionAtAfter: nextActionAt
            });
            console.log(`[v2Engine] AI reply sent for ${intent} intent on lead ${leadId}`);
          } else {
            console.warn(`[v2Engine] SMTP failed for AI reply: ${replySendResult?.error}`);
          }
        }
      }

      await CampaignProspect.findByIdAndUpdate(leadId, {
        v2State: newState, status: mapV2Status(newState), nextActionAt, processingLock: false, ...aiMemoryUpdate
      });
      await writeLog({
        ...logData, stateAfter: newState, action: 'reply_classified',
        replyIntent: intent, replyObjectionType: objectionType || null,
        nextActionAtAfter: nextActionAt
      });

      // ── CRM Activity logging for reply classification ─────────────────
      try {
        const prospectName = `${lead.prospect?.firstName || ''} ${lead.prospect?.lastName || ''}`.trim() || lead.prospect?.email || 'Unknown';
        await CrmActivity.create({
          user: 'System',
          action: `detected ${intent} reply from`,
          target: prospectName,
          type: 'c',
        });
      } catch (actErr) {
        console.error('[v2Engine] CrmActivity log failed:', actErr.message);
      }
      return;
    }

    // ── COOLING CYCLE CHECK (PRD §3.7) ──────────────────────────────────────
    const maxAttempts = campaign.v2Delays.maxAttemptsPerCycle || 6;
    if ((lead.attemptCount || 0) >= maxAttempts) {
      const coolingUntil = calculateNextActionAt(campaign, maxAttempts + 1);
      // Reset for next cycle
      await CampaignProspect.findByIdAndUpdate(leadId, {
        attemptCount: 0,
        status: mapV2Status(stateBefore || 'contacted'),
        nextActionAt: coolingUntil,
        processingLock: false,
        'aiMemory.angleHistory': [],
        'aiMemory.lastAngleIndex': null
      });
      await writeLog({ ...logData, stateAfter: stateBefore || 'contacted', action: 'cooling_triggered', nextActionAtAfter: coolingUntil });
      return;
    }

    // ── EMAIL GENERATION BRANCH ──────────────────────────────────────────────
    // Determine angle (PRD §5.3 — deterministic rotation)
    const angles = campaign.v2Angles || [];
    const attemptCount = lead.attemptCount || 0;
    const angleIndex = attemptCount % Math.max(angles.length, 1);
    const selectedAngle = angles[angleIndex] || { key: 'direct', description: 'Send a direct, professional outreach message.' };
    const escalationLevel = getEscalationLevel(attemptCount + 1);
    const openStatus = !!(lead.lastOpenedAt);

    // Fetch prior messages for context / threading (PRD §5.9, §7.3)
    const priorMessages = await fetchRecentLeadMessages(lead, 5);
    const previousMessages = priorMessages
      .slice(0, 3)
      .map((m) => ({ subject: m.subject, body: m.content || '' }));

    // ── CONTENT PRIORITY LADDER (PRD §6.1) ──────────────────────────────────
    // Priority 1: Per-lead per-step content from emailSteps[attemptCount]
    // Priority 2: Legacy customSubject/customBody (step 0 only, backward compat)
    // Priority 3: AI generation via generateTargetedEmail
    let subject, body;
    const isInitialSend = attemptCount === 0;

    const stepContent = (lead.emailSteps || []).find(s => s.step === attemptCount + 1); // steps are 1-indexed

    if (stepContent?.subject && stepContent?.body) {
      // Priority 1 — per-lead CSV step content
      subject = stepContent.subject;
      body = stepContent.body;
      console.log(`[v2Engine] Using emailSteps[${attemptCount}] for lead ${leadId}`);

    } else if (isInitialSend && lead.customSubject && lead.customBody) {
      // Priority 2 — legacy CSV fields (only on first send)
      subject = lead.customSubject;
      body = lead.customBody;
      console.log(`[v2Engine] Using legacy customSubject/customBody for lead ${leadId}`);

    } else {
      // No configured content for this step — complete the lead instead of AI-generating
      console.log(`[v2Engine] No emailSteps or custom content for step ${attemptCount + 1}, completing lead ${leadId}`);
      await CampaignProspect.findByIdAndUpdate(leadId, {
        v2State: 'completed',
        status: 'completed',
        nextActionAt: null,
        stopFlag: true,
        processingLock: false
      });
      await writeLog({
        ...logData,
        stateAfter: 'completed',
        action: 'completed_no_steps',
        notes: `No emailSteps content found for step ${attemptCount + 1}`
      });
      return;
    }

    // ── PLACEHOLDER REPLACEMENT: [Name] → mailbox sender name (PRD §7.10) ────
    // When CSV templates use [Name] in subject/body (typically for signatures),
    // replace with the sending mailbox's fromName. This ensures each mailbox's
    // emails carry the correct sender identity in the signature.
    if (mailbox.fromName) {
      subject = subject.replace(/\[Name\]/gi, mailbox.fromName);
      body = body.replace(/\[Name\]/gi, mailbox.fromName);
    }

    // ── THREADING: Force "Re: <original subject>" on follow-ups (RFC 2822) ────
    // Email clients (Gmail, Outlook) thread by subject + In-Reply-To/References.
    // If the follow-up has a different subject, it breaks the thread and appears
    // as a brand new email. We store the original subject on first send and
    // prefix all follow-ups with "Re: ".
    if (!isInitialSend && lead.threadSubject) {
      subject = `Re: ${lead.threadSubject}`;
      console.log(`[v2Engine] Threading: overrode subject to "${subject}" for lead ${leadId}`);
    }

    // ── QUOTED HISTORY: Append previous email as quoted block (RFC 2822) ──────
    // Gmail/Outlook use quoted text as a strong threading signal. Without it,
    // follow-ups can appear as separate emails even with correct headers.
    if (!isInitialSend && priorMessages.length > 0) {
      const lastMsg = priorMessages[0]; // Most recent message (sorted by createdAt desc)
      if (lastMsg && lastMsg.content) {
        const sentDate = lastMsg.createdAt
          ? new Date(lastMsg.createdAt).toLocaleDateString('en-US', {
              weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
              hour: 'numeric', minute: '2-digit'
            })
          : 'earlier';
        const senderName = mailbox.fromName || mailbox.fromEmail;

        // Clean the previous content — strip HTML tags and tracking pixels
        const cleanContent = (lastMsg.content || '')
          .replace(/<[^>]+>/g, '')  // strip HTML tags
          .replace(/\n{3,}/g, '\n\n')  // collapse excessive newlines
          .trim();

        // Append quoted block to plain text body
        body += `\n\n\nOn ${sentDate}, ${senderName} wrote:\n${cleanContent.split('\n').map(l => '> ' + l).join('\n')}`;

        console.log(`[v2Engine] Threading: appended quoted history from ${sentDate} for lead ${leadId}`);
      }
    }

    // ── SPAM FILTER CHECK ───────────────────────────────────────────────────
    // Warn if content triggers spam filters
    const spamTriggers = [
      /!!!+/g,                              // Multiple exclamation marks
      /\$\$|£££|€€€/g,                      // Excessive currency symbols
      /FREE|URGENT|WINNER|GUARANTEE/gi,    // Spam keywords
      /CLICK HERE|BUY NOW|ACT NOW/gi,      // CTA spam
      /https?:\/\/[^\s]+/g                 // Excessive links in text
    ];
    
    let spamScore = 0;
    if (spamTriggers.some(trigger => trigger.test(body))) {
      spamScore += 1;
    }
    
    if (spamScore > 0) {
      console.warn(`[v2Engine] Email for ${lead.prospect.email} has potential spam triggers (score: ${spamScore}). AI may have used high-pressure language.`);
    }

    // ── SEND EMAIL (PRD §7.1, §7.2) ─────────────────────────────────────────
    // Thread continuity headers (PRD §7.3)
    // Build References from ALL prior Message-IDs for robust threading.
    // In-Reply-To should point to the MOST RECENT message (not the first).
    const priorMessageIds = priorMessages
      .map(m => m.headerMessageId)
      .filter(Boolean)
      .reverse(); // oldest first, per RFC 2822 References spec

    const inReplyTo = priorMessageIds.length > 0
      ? priorMessageIds[priorMessageIds.length - 1]  // most recent
      : (lead.threadHeaderMessageId || null);
    const references = priorMessageIds.length > 0
      ? priorMessageIds  // full chain: oldest → newest
      : (lead.threadHeaderMessageId ? [lead.threadHeaderMessageId] : []);
    const generatedTrackingId = `${lead._id.toString()}-${Date.now()}`;

    // ── CLICK TRACKING (PRD §7.8) ───────────────────────────────────────────
    // Wrap all URLs in click tracker for analytics
    const wrapUrlForTracking = (url, tid) =>
      buildTrackingUrl(`/api/track/click/${tid}?url=${encodeURIComponent(url)}`);
    
    const trackedBody = body.replace(
      /https?:\/\/[^\s<>"]+/g,
      (url) => wrapUrlForTracking(url, generatedTrackingId)
    );
    
    // Build HTML version with properly styled quoted block
    // Split the body: everything before "On ... wrote:" is the new content,
    // everything after is the quoted block (needs left-border styling).
    let trackedHtml;
    const quoteMatch = trackedBody.match(/\n\n\nOn .+? wrote:\n([\s\S]+)$/);
    if (quoteMatch) {
      const newPart = trackedBody.substring(0, quoteMatch.index);
      const quotedPart = quoteMatch[0];
      // Gmail-style quoted block: grey left border, smaller text
      trackedHtml = newPart.replace(/\n/g, '<br>') +
        `<br><br><div style="border-left:2px solid #ccc;padding-left:12px;margin-left:0;color:#555;font-size:13px;">${quotedPart.replace(/\n/g, '<br>').replace(/^<br><br><br>/, '')}</div>`;
    } else {
      trackedHtml = trackedBody.replace(/\n/g, '<br>');
    }

    let sendResult;
    try {
      sendResult = await SMTPService.sendEmail({
        mailbox,
        to: lead.prospect.email,
        subject,
        html: `<p>${trackedHtml}</p>`,
        text: trackedBody,
        trackingId: generatedTrackingId,
        inReplyTo,
        references
      });
    } catch (smtpErr) {
      sendResult = { success: false, error: smtpErr.message };
    }

    // ── SEND RESULT HANDLING ─────────────────────────────────────────────────
    if (sendResult.success) {
      const newAttemptCount = attemptCount + 1;
      const newState = isInitialSend ? 'contacted' : (stateBefore === 'opened' ? 'contacted' : (stateBefore || 'contacted'));
      const nextAt = calculateNextActionAt(campaign, newAttemptCount, openStatus);

      // Set threadHeaderMessageId + threadSubject on first send (PRD §7.3)
      const threadUpdate = isInitialSend && (sendResult.headerMessageId || sendResult.messageId)
        ? {
            threadHeaderMessageId: sendResult.headerMessageId || sendResult.messageId,
            threadSubject: subject  // Store original subject for "Re: " prefixing
          }
        : {};

      // Update aiMemory angle history (PRD §5.4)
      const existingAngleHistory = lead.aiMemory?.angleHistory || [];
      const newAngleHistory = [...existingAngleHistory, angleIndex].slice(-20); // cap at 20

      // Update mailbox daily sent metrics (auto-resets if day changed)
      await Mailbox.incrementDailySent(mailbox._id);

      await CampaignProspect.findByIdAndUpdate(leadId, {
        v2State: newState,
        status: mapV2Status(newState),
        attemptCount: newAttemptCount,
        failureCount: 0, // reset on success
        nextActionAt: nextAt,
        lastSentAt: new Date(),
        processingLock: false,
        'aiMemory.lastAngleIndex': angleIndex,
        'aiMemory.angleHistory': newAngleHistory,
        ...threadUpdate
      });

      // Create Message document (PRD §7.4)
      await Message.create({
        prospectId: lead.prospect._id,
        campaignId: campaign._id,
        mailboxId: mailbox._id,
        trackingId: generatedTrackingId,
        subject,
        content: trackedBody, // Store tracked version for audit trail
        headerMessageId: sendResult.headerMessageId || sendResult.messageId,
        status: 'sent',
        events: [{ type: 'sent', timestamp: new Date() }]
      });

      await writeLog({
        ...logData,
        stateAfter: newState,
        action: isInitialSend ? 'initial_send' : 'followup_send',
        angleIndex,
        angleKey: selectedAngle.key,
        escalationLevel,
        attemptCountAfter: newAttemptCount,
        nextActionAtAfter: nextAt
      });

      // ── CRM Activity logging ───────────────────────────────────────────
      try {
        const prospectName = `${lead.prospect?.firstName || ''} ${lead.prospect?.lastName || ''}`.trim() || lead.prospect?.email || 'Unknown';
        await CrmActivity.create({
          user: 'System',
          action: isInitialSend ? 'sent initial email to' : `sent follow-up #${newAttemptCount} to`,
          target: prospectName,
          type: 'c',
        });
      } catch (actErr) {
        console.error('[v2Engine] CrmActivity log failed:', actErr.message);
      }

    } else {
      // ── SMTP FAILURE (PRD §7.5, §3.8) ──────────────────────────────────────
      const newFailureCount = (lead.failureCount || 0) + 1;
      const isHardFailure = newFailureCount > 5;
      const nextAt = isHardFailure ? null : calculateRetryBackoff(newFailureCount);
      const newState = isHardFailure ? 'failed' : (stateBefore || 'new');

      // Log failed Message (PRD §7.4)
      await Message.create({
        prospectId: lead.prospect._id,
        campaignId: campaign._id,
        mailboxId: mailbox._id,
        trackingId: generatedTrackingId,
        subject,
        content: body,
        status: 'failed',
        errorMessage: sendResult.error
      });

      await CampaignProspect.findByIdAndUpdate(leadId, {
        v2State: newState,
        status: mapV2Status(newState),
        failureCount: newFailureCount,
        nextActionAt: nextAt,
        stopFlag: isHardFailure,
        processingLock: false
      });

      await writeLog({
        ...logData,
        stateAfter: newState,
        action: isHardFailure ? 'hard_stopped' : 'retry_scheduled',
        error: sendResult.error,
        errorCategory: 'smtp_failure',
        failureCount: newFailureCount,
        nextActionAtAfter: nextAt
      });
    }

  } catch (err) {
    // Unexpected error — release lock and log
    console.error(`[v2Engine] Unexpected error processing lead ${leadId}:`, err);
    await releaseLead(leadId, addHours(new Date(), 1));
    await writeLog({
      ...logData,
      stateAfter: stateBefore || 'new',
      action: 'retry_scheduled',
      error: err.message,
      errorCategory: 'smtp_failure',
      nextActionAtAfter: addHours(new Date(), 1)
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

// Unlock lead and update nextActionAt
async function releaseLead(leadId, nextActionAt) {
  await CampaignProspect.findByIdAndUpdate(leadId, {
    processingLock: false,
    processingStartedAt: null,
    nextActionAt
  });
}

// Persist an EngineLog entry (PRD §11.1 — mandatory for every decision)
async function writeLog(data) {
  try {
    await EngineLog.create({
      campaignId:        data.campaignId,
      leadId:            data.leadId,
      stateBefore:       data.stateBefore || null,
      stateAfter:        data.stateAfter,
      action:            data.action,
      angleIndex:        data.angleIndex ?? null,
      angleKey:          data.angleKey ?? null,
      escalationLevel:   data.escalationLevel ?? null,
      nextActionAtBefore: data.nextActionAtBefore ?? null,
      nextActionAtAfter:  data.nextActionAtAfter ?? null,
      attemptCountBefore: data.attemptCountBefore ?? null,
      attemptCountAfter:  data.attemptCountAfter ?? null,
      failureCount:       data.failureCount ?? null,
      error:              data.error ?? null,
      errorCategory:      data.errorCategory ?? null,
      replyIntent:        data.replyIntent ?? null,
      replyObjectionType: data.replyObjectionType ?? null,
      timestamp:          new Date()
    });
  } catch (logErr) {
    // Never let log failure crash the engine
    console.error('[v2Engine] Failed to write EngineLog:', logErr.message);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Self-healing guards (PRD §11.4)
// Run periodically to catch leads in corrupted state.
// ─────────────────────────────────────────────────────────────────────────────
export async function repairCorruptedLeads(campaignId = null) {
  await connectDB();

  const query = {
    v2State: { $nin: [...TERMINAL_STATES, 'completed'] },
    stopFlag: false,
    nextActionAt: null
  };
  if (campaignId) query.campaign = campaignId;

  const stuckLeads = await CampaignProspect.find(query);
  for (const lead of stuckLeads) {
    console.warn(`[v2Engine] Repairing corrupted lead: ${lead._id}`);
    const campaign = await Campaign.findById(lead.campaign);
    const safeNext = campaign
      ? calculateNextActionAt(campaign, lead.attemptCount || 0)
      : addHours(new Date(), 24);

    await CampaignProspect.findByIdAndUpdate(lead._id, { nextActionAt: safeNext });
    await writeLog({
      campaignId: lead.campaign,
      leadId: lead._id,
      stateBefore: lead.v2State,
      stateAfter: lead.v2State || 'new',
      action: 'corruption_repaired',
      nextActionAtAfter: safeNext,
      error: 'Lead had null nextActionAt with non-terminal state'
    });
  }

  return stuckLeads.length;
}
