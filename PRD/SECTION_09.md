SECTION 9 — API Layer & Backend Contracts
Strict Frontend ↔ Backend Discipline

This section defines:

Allowed API endpoints

What each endpoint can mutate

What each endpoint must NOT mutate

Activation rules

Settings rules

Lead import rules

Permission boundaries

Frontend is minimal.
Backend remains sovereign.

9.1 API Design Philosophy

APIs must:

✔ Configure strategy
✔ Create campaigns
✔ Import leads
✔ Activate/pause campaigns
✔ View logs

APIs must NOT:

✘ Schedule emails directly
✘ Mutate nextActionAt arbitrarily
✘ Mutate attemptCount
✘ Mutate state
✘ Trigger direct send bypassing engine

All runtime behavior must pass through processLead().

9.2 Campaign APIs
9.2.1 Create Campaign

POST /api/campaigns

Allowed fields:

{
  name,
  goal,
  mailboxId,
  timezone,
  businessHours,
  dailySendLimit,
  hourlySendLimit,
  baseDelayHours,
  escalationMultiplier,
  coolingPeriodDays,
  maxAttemptsPerCycle,
  angles
}

Default:

status = "draft"
useV2Engine = true

Must validate:

mailboxId exists

angles.length >= 3

timezone valid

limits reasonable

Must NOT:

Create leads automatically

Schedule anything

9.2.2 Update Campaign Settings

PUT /api/campaigns/:id

Allowed updates:

goal

limits

delays

angles

businessHours

coolingPeriodDays

Must NOT:

Reset attemptCount

Modify lead state

Change nextActionAt

Force resend

Changes apply on next engine run.

9.2.3 Activate Campaign

POST /api/campaigns/:id/activate

Rules:

Campaign must have:

mailboxId

timezone

angles

For each lead:

state = "new"
stopFlag = false
nextActionAt = now

No stagger scheduling.
No +2 minute increments.

Cron handles distribution via rate limiting.

9.2.4 Pause Campaign

POST /api/campaigns/:id/pause

Action:

campaign.status = "paused"

Engine must skip paused campaigns.

Leads retain state.

No mutation of nextActionAt required.

9.3 Lead APIs
9.3.1 Import Leads

POST /api/campaigns/:id/leads

Allowed fields:

{
  email,
  name,
  customInitialSubject?,
  customInitialBody?
}

On insert:

state = "new"
attemptCount = 0
failureCount = 0
nextActionAt = null
stopFlag = false

If campaign active:

Set nextActionAt = now

Must NOT:

Precompute multiple future sends

Precompute delays

9.3.2 Manual Stop Lead

POST /api/leads/:id/stop

Action:

state = "stopped"
stopFlag = true
nextActionAt = null
9.3.3 Resume Lead

POST /api/leads/:id/resume

If not terminal:

stopFlag = false
nextActionAt = now + baseDelay

State remains same.

9.4 Settings Validation Rules

Before campaign activation:

Validate:

dailySendLimit ≤ 100

hourlySendLimit ≤ 20

baseDelayHours ≥ 24

coolingPeriodDays ≥ 14

maxAttemptsPerCycle ≤ 10

Prevents misconfiguration causing spam.

9.5 Engine Trigger Endpoint (Internal)

Optional:

POST /api/internal/process-lead/:id

Used by:

IMAP reply handler

Debugging

Must require internal authentication.

Must not be exposed publicly.

9.6 Permission Boundaries

Since this is internal tool:

Only admin-level users allowed.

No public access.

No client-level accounts.

Future-proofing:

All APIs must be workspace-scoped.

Campaign → workspaceId
Mailbox → workspaceId
Lead → workspaceId

No cross-workspace queries allowed.

9.7 Forbidden API Behaviors

APIs must never:

Directly call SMTP.

Directly call AI.

Directly mutate scheduling fields.

Implement hidden retry loops.

Introduce alternative cron endpoints.

If new feature requires runtime logic:
It must be implemented inside processLead().

9.8 Data Consistency Safeguards

Add validation middleware:

Before saving lead:

If:

stopFlag = true

Then enforce:

nextActionAt = null

If:

state in ["bounced", "failed", "completed", "stopped"]

Then:

nextActionAt = null

Prevent corrupted scheduling state.

9.9 Minimal UI Implications

Since this is internal:

UI only needs:

Campaign creation form

Angle editor

Limits settings

Lead import screen

Campaign dashboard

Lead debug view

Pause/Resume buttons

No flow builder.
No visual graph.
No complex builder.

Simple is safer.

9.10 Anti-Chaos Enforcement Comment

At top of API layer:

// DO NOT add scheduling logic here.
// All runtime behavior must go through outreachEngine.ts

This prevents future self-sabotage.

SECTION 9 complete.