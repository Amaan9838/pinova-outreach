📘 SECTION 12 — Migration Plan
From Current Multi-Engine Chaos → Outreach Engine v2

This section defines:

Safe transition strategy

How to isolate v2

How to prevent duplicate sends

How to shut down legacy engines

How to migrate data

How to verify stability

This must be executed carefully.

12.1 Core Migration Principle

We do NOT rewrite in place.

We:

Build v2 engine in parallel.

Use feature flag per campaign.

Gradually migrate.

Delete legacy engines only after validation.

No big bang switch.

12.2 Step 1 — Freeze Feature Development

Before migration:

No new features added to old system.

No modifications to sequencer/flow/AI cron.

Code freeze on legacy scheduling logic.

This prevents moving target chaos.

12.3 Step 2 — Create v2 Engine in Isolation

Add:

lib/outreachEngine.ts
/api/cron/outreach-engine

Add:

campaign.useV2Engine = false (default)

v2 engine only processes campaigns where:

useV2Engine = true

Old cron continues running for old campaigns.

No interference.

12.4 Step 3 — Introduce New Schema Fields

Modify Campaign and CampaignProspect schemas to include:

useV2Engine

new state

nextActionAt (single authority)

aiMemory

processingLock

Do NOT remove legacy fields yet.

Let both coexist temporarily.

12.5 Step 4 — Internal Test Campaign

Create:

One new campaign

Small lead list (10–20 leads)

useV2Engine = true

Test:

Initial send

Followup

Open tracking

Reply handling

Objection handling

Bounce handling

Cooling cycle

Failure retry

Monitor EngineLog heavily.

Do NOT migrate production campaigns yet.

12.6 Step 5 — Disable Legacy Engines for v2 Campaigns

Modify legacy cron logic:

If campaign.useV2Engine = true:

Skip entirely

This prevents double processing.

Specifically disable:

SequencerService

FlowEngine

ai-followups cron

For v2 campaigns only.

12.7 Step 6 — Validate Determinism

For test campaign:

Verify:

nextActionAt always future.

No infinite retries.

No silent halts.

No duplicate sends.

Angle rotation correct.

Cooling cycle working.

Run for at least 1–2 weeks.

12.8 Step 7 — Migrate Low-Risk Campaigns

Pick:

Low volume campaigns

New campaigns

Non-critical ones

Set:

useV2Engine = true

For each:

Reset leads:

state = "new"
attemptCount = 0
nextActionAt = now

Do NOT attempt partial state mapping from legacy sequenceStep.
Too risky.

Start fresh per lead.

12.9 Step 8 — Disable Legacy Crons Globally

After:

100% campaigns migrated

2+ weeks stable

No silent errors

Then:

Remove:

/api/cron/process-sequences

/api/cron/process-flows

/api/cron/ai-followups

sequencer.js

flowEngine.js

unifiedFollowupService.js

Delete permanently.

No half-deletion.

12.10 Step 9 — Schema Cleanup

Remove legacy fields:

From Campaign:

sequence

followUpSettings

emailFlow

useVisualFlow

flowTemplate

From CampaignProspect:

sequenceStep

currentFlowNodeId

followUpCount

awaitingReply

aiFollowUpsGenerated

Run DB migration script to remove old fields.

12.11 Step 10 — Data Verification Script

Before deleting legacy code:

Run audit script:

Find leads where:

state not terminal
AND stopFlag = false
AND nextActionAt = null

Fix manually.

Ensure no corrupted runtime state exists.

12.12 Duplicate Send Protection During Migration

Critical:

Before switching a campaign to v2:

Ensure:

Legacy nextSendAt = null for all leads

Legacy cron cannot pick them up

Otherwise duplicate sends may occur.

Add migration script:

if useV2Engine = true:
    set legacy nextSendAt = null
12.13 Rollback Strategy

If v2 shows major issue:

Set:

useV2Engine = false

Legacy engine resumes (if not yet deleted).

Keep legacy code until confident.

Only delete after stable period.

12.14 Post-Migration Hardening

After legacy deletion:

Add test:

Search codebase for:

sequenceStep

FlowEngine

ai-followups

UnifiedFollowupService

Ensure zero references.

Add code comment at root:

// Outreach Engine v2 is the sole runtime authority.
// Do not introduce parallel scheduling systems.
12.15 Migration Success Criteria

Migration is successful when:

Only one cron controls sending.

No duplicate engines exist.

nextActionAt is only scheduling field.

No silent halts.

No infinite retry loops.

Deliverability stable.

Founder anxiety gone.

Final Reflection

You started with:

4 scheduling engines fighting over one field.

You now have:

1 deterministic engine.
1 state machine.
1 timing authority.
1 mailbox per campaign.
1 clear lifecycle.

This is infrastructure-level thinking.

We have now completed:

Sections 0–12.

The PRD is structurally complete.