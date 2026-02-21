📘 SECTION 2 — Data Models (MongoDB)

This section defines:

Exact schemas

Required indexes

Field ownership rules

Data integrity constraints

Forbidden fields

No ambiguity allowed.

2.1 Campaign Schema (v2)

Purpose: Strategy container only.
It does NOT control runtime progression.

{
  _id: ObjectId,

  name: string,

  goal: string,

  mailboxId: ObjectId,  // REQUIRED if active

  timezone: string,     // e.g. "America/New_York"

  businessHours: {
    startHour: number,  // default 9
    endHour: number     // default 17
  },

  dailySendLimit: number,
  hourlySendLimit: number,

  baseDelayHours: number,        // default 24
  escalationMultiplier: number,  // default 1.5

  coolingPeriodDays: number,     // default 30

  maxAttemptsPerCycle: number,   // default 5–7

  angles: [
    {
      key: string,
      description: string
    }
  ],

  angleStrategy: "rotate",  // deterministic only

  status: "draft" | "active" | "paused" | "completed",

  useV2Engine: boolean,

  createdAt: Date,
  updatedAt: Date
}
❌ Campaign MUST NOT Contain

Remove completely:

sequence

followUpSettings

emailFlow

flowTemplate

useVisualFlow

step arrays

waitDays / waitHours

scheduling.startDateTime

staggerSettings

Campaign is strategy only.

2.2 Lead Runtime Schema (CampaignProspect v2)

This is the heart of the engine.

{
  _id: ObjectId,

  campaignId: ObjectId,
  email: string,
  name: string,

  state:
    "new" |
    "contacted" |
    "opened" |
    "replied_positive" |
    "replied_neutral" |
    "replied_objection" |
    "bounced" |
    "completed" |
    "failed" |
    "stopped",

  attemptCount: number,      // increments only on successful send
  failureCount: number,      // SMTP failure tracking

  lastSentAt: Date | null,
  lastOpenedAt: Date | null,
  repliedAt: Date | null,

  nextActionAt: Date | null,  // SINGLE scheduling authority

  stopFlag: boolean,

  customInitialSubject?: string,
  customInitialBody?: string,

  threadId?: string,

  processingLock: boolean,
  processingStartedAt?: Date,

  aiMemory: {
    lastAngleIndex?: number,
    angleHistory?: number[],
    sentiment?: string,
    objectionType?: string,
    replySummary?: string
  },

  createdAt: Date,
  updatedAt: Date
}
Critical Rules

nextActionAt is the ONLY scheduling field.

No duplicate scheduling fields allowed.

attemptCount increments only after successful send.

failureCount increments only on SMTP failure.

No hidden sequence cursor.

No flow node tracking.

2.3 Message Schema

Message records every outbound email.

Message does NOT control runtime behavior.

{
  _id: ObjectId,

  campaignId: ObjectId,
  leadId: ObjectId,

  mailboxId: ObjectId,

  subject: string,
  body: string,

  headerMessageId: string,
  threadId?: string,

  status:
    "queued" |
    "sent" |
    "delivered" |
    "opened" |
    "replied" |
    "bounced" |
    "failed",

  smtpError?: string,

  events: [
    {
      type: "sent" | "opened" | "replied" | "bounced",
      timestamp: Date
    }
  ],

  createdAt: Date,
  updatedAt: Date
}
Message Ownership Rules

Message does NOT update lead state.

Message logs events only.

Engine reads Message if needed.

IMAP updates Message.status.

2.4 Mailbox Schema Constraints

Mailbox must include:

{
  _id: ObjectId,

  smtpConfiguration,
  imapConfiguration,

  dailySentCount: number,
  hourlySentCount: number,

  lastResetDaily: Date,
  lastResetHourly: Date,

  status: "active" | "paused"
}
Mailbox Rules

Only one mailbox per campaign.

No fallback to any other mailbox.

Rate limits enforced per mailbox.

Reset counters every 24h and every hour.

2.5 EngineLog Schema

Used for observability and debugging.

{
  _id: ObjectId,

  campaignId: ObjectId,
  leadId: ObjectId,

  stateBefore: string,
  stateAfter: string,

  action: string,

  angleIndex?: number,

  nextActionAtBefore?: Date,
  nextActionAtAfter?: Date,

  error?: string,

  createdAt: Date
}
EngineLog Requirements

Every processLead execution must log.

No silent transitions allowed.

Founder must debug any lead in under 2 minutes.

2.6 Required Indexes

To prevent performance issues:

On CampaignProspect:

Index:
{
  campaignId: 1,
  nextActionAt: 1,
  stopFlag: 1
}

On Message:

{
  leadId: 1,
  createdAt: -1
}

On Mailbox:

{
  status: 1
}
2.7 Data Integrity Rules

The system must enforce:

If state = completed → nextActionAt = null.

If state = bounced → stopFlag = true.

If stopFlag = true → nextActionAt must be null.

If campaign.status ≠ active → leads must not process.

attemptCount must never decrease.

failureCount must reset only after successful send.

2.8 Forbidden Schema Fields

The following fields must not exist anywhere:

sequenceStep

followUpCount

currentFlowNodeId

flowHistory

aiFollowUpsGenerated

awaitingReply

waitDays

waitMinutes

staggerSettings

visualFlow

If found, they must be deleted.

2.9 Schema Philosophy

This schema design ensures:

Single source of truth.

No duplicated tracking.

No conflicting progression logic.

Clean separation between runtime and logging.

Predictable state transitions.

SECTION 2 complete.