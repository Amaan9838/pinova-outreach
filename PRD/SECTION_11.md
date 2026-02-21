📘 SECTION 11 — Observability & Operational Safety
Making the Engine Explainable and Stable

This section defines:

Logging guarantees

Lead lifecycle traceability

Error visibility

Alert conditions

Operational safeguards

Self-healing rules

Founder debug confidence

This prevents:

“I don’t know what happened.”

Silent failures.

Infinite loops.

Hidden corruption.

11.1 EngineLog — Mandatory for Every Decision

Every execution of processLead() must create an EngineLog entry.

Structure:

{
  campaignId,
  leadId,

  stateBefore,
  stateAfter,

  action, // "initial_send", "followup_send", "reply_classified", "cooling_triggered", "retry_scheduled"

  angleIndex?,
  escalationLevel?,

  nextActionAtBefore?,
  nextActionAtAfter?,

  error?,

  timestamp
}

No state transition without log.

No exception.

11.2 Lead Lifecycle Traceability

For any lead, system must allow reconstruction of:

When first sent

What angles used

What subjects used

When opened

When replied

Why follow-up sent

Why delay changed

Why stopped

This must be visible in Lead Debug View (Section 10).

If lifecycle cannot be explained → architecture violation.

11.3 Error Visibility Rules

Errors must be categorized:

SMTP failure

AI generation failure

AI classification failure

IMAP failure

Mailbox rate limit reached

State corruption detected

Each error must:

Be logged in EngineLog

Increment relevant counter

Be visible in campaign dashboard

No silent error swallowing.

11.4 Self-Healing Guards

To prevent corruption:

Guard 1 — Null Scheduling Detection

If:

state not terminal
stopFlag = false
nextActionAt = null

Engine must:

Log corruption warning

Set nextActionAt = now + baseDelayHours

Prevents silent halt.

Guard 2 — Past Scheduling Loop Detection

If:

nextActionAt < now - 1 hour

Engine must:

Log warning

Reschedule safely

Prevents infinite retry loops.

Guard 3 — Excessive Failure Guard

If:

failureCount >= 3

Log warning:
“Mailbox or domain issue likely.”

If:

failureCount >= 5

Hard stop lead.

11.5 Deliverability Health Monitoring

Per campaign dashboard must show:

Sent today

Open rate

Reply rate

Bounce rate

Failure rate

If bounceRate > 5%:

Show red warning

If failureRate spikes:

Suggest mailbox issue

11.6 Mailbox Health Monitoring

Per mailbox track:

Daily sent

Hourly sent

Last send time

Failure ratio

If dailySentCount > dailySendLimit:

Auto throttle

If failureCount across leads > threshold:

Recommend pause campaign

11.7 Alert Conditions (Internal Tool)

Since this is internal tool:

We don’t need full alerting system.

But we should log critical events:

Infinite loop prevented

State corruption repaired

High bounce rate

High SMTP failure rate

AI repeated JSON failure

These should be visible in admin panel.

11.8 Debugging Workflow (Founder Mental Safety)

When something feels wrong:

You should be able to:

Open campaign

Open specific lead

See state

See nextActionAt

See EngineLog history

See last AI output

See SMTP result

See reply classification

In under 2 minutes.

If debugging takes longer → observability insufficient.

11.9 Concurrency Safety

Add global guard:

If processLead() takes > 60 seconds:

Log timeout warning

Release lock

Prevent deadlock

Lock expiration safety:

If processingLock = true AND processingStartedAt older than 10 minutes:

Reset lock automatically

Prevents stuck leads.

11.10 Deterministic Confidence Principle

For any lead at any moment, answer must be:

Why is it in this state?

Why is nextActionAt this value?

What will happen next?

If answer unclear → bug.

11.11 Scaling Confidence

This architecture must scale to:

10,000 leads

100+ campaigns

Multiple mailboxes

Long-running cycles

Because:

Single cron

Indexed nextActionAt

Deterministic state

No duplicate engines

Scaling is linear, not chaotic.

11.12 Founder Anxiety Elimination Rule

Your current anxiety came from:

Invisible scheduling logic

Duplicate engines

Hidden mutations

This design eliminates:

Hidden mutation points

Multiple schedulers

Untraceable state transitions

Observability is as important as logic.

SECTION 11 complete.