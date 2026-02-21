📘 SECTION 3 — Scheduling & Timing System

This section defines:

How nextActionAt is calculated

How business hours are enforced

How rate limits are enforced

How follow-up spacing works

How retry backoff works

How cooling cycles work

How India → US timezone conversion works

How spam bursts are prevented

No ambiguity allowed.

3.1 nextActionAt — Single Timing Authority

nextActionAt is the only field that controls execution timing.

Rules:

It is set ONLY by processLead().

It must always be stored in UTC.

All business-hour logic must convert from UTC → campaign timezone.

If nextActionAt = null, lead will never process.

No other timestamp controls scheduling.

3.2 Cron Execution Model

Cron runs every 5 minutes.

Query:

find leads where:
- nextActionAt <= now
- stopFlag = false
- campaign.status = active
- campaign.useV2Engine = true

Important:
Cron does NOT guarantee immediate send.
Rate limiting and business-hour checks may defer further.

3.3 Business Hours Enforcement (US-Safe Sending)

Each campaign defines:

timezone: "America/New_York"
businessHours:
  startHour: 9
  endHour: 17

Algorithm when processing a lead:

Convert current UTC time to campaign timezone.

If outside business hours:

Calculate next valid business window.

Set nextActionAt to that time.

Exit.

If weekend:

Shift to next Monday at startHour.

This prevents:

2 AM sends

Sunday sends

Spam-pattern behavior

3.4 Rate Limiting (Mailbox-Level)

Each mailbox enforces:

dailySendLimit

hourlySendLimit

minimumGapBetweenSends (2–5 minutes)

Before sending:

Check hourly count.

Check daily count.

If limit exceeded:

Set lead.nextActionAt = next allowed hour/day.

Exit without state change.

After successful send:

Increment mailbox counters.

Record timestamp.

Counters reset:

Hourly → every 60 minutes.

Daily → every 24 hours.

No bulk bursts allowed.

3.5 Follow-Up Spacing Logic

You said: “make spacing shrinked.”

Shrinking spacing is dangerous for spam.

Correct safe implementation:

We use controlled acceleration early,
then widening spacing later.

Recommended schedule:

Attempt 1 → immediate (activation)
Attempt 2 → 24h
Attempt 3 → 48h
Attempt 4 → 72h
Attempt 5 → 4 days
Attempt 6 → 7 days

Formula-based approach:

delayHours = baseDelayHours * Math.pow(escalationMultiplier, attemptCount - 1)

With defaults:

baseDelayHours = 24

escalationMultiplier = 1.5

This creates natural widening.

No shrinking below 24h allowed.

3.6 Open vs No-Open Timing Adjustment

If:

Lead opened but did not reply

We can shorten slightly (but safely):

Example:

No open → next = 48h
Opened → next = 36h

But never less than 24h gap.

Rule:

Minimum follow-up gap = 24 hours.

This protects deliverability.

3.7 Cooling-Off Cycle

After:

attemptCount >= maxAttemptsPerCycle

Engine must:

Set nextActionAt = now + coolingPeriodDays

Reset attemptCount = 0

Optionally rotate angle cycle

CoolingPeriod default: 30 days.

This prevents:

Aggressive infinite loops

Domain decay

This is your “infinite” persistence in safe form.

3.8 Retry Backoff (SMTP Failure)

If SMTP send fails:

failureCount++

New nextActionAt:

retryDelay = min(2^failureCount * 10 minutes, 24 hours)

Examples:

Failure 1 → 10 minutes
Failure 2 → 20 minutes
Failure 3 → 40 minutes
Failure 4 → 80 minutes
Failure 5 → 160 minutes

If failureCount > 5:

state = failed

stopFlag = true

nextActionAt = null

No infinite retry loops allowed.

3.9 India → US Timezone Handling

All timestamps stored in UTC.

All decision logic converts:

UTC → campaign.timezone

Never rely on server timezone.

Implementation requirement:

Use reliable timezone library (e.g., date-fns-tz or Luxon).

When scheduling nextActionAt:

Compute delay in campaign timezone.

Ensure inside business hours.

Convert back to UTC before storing.

3.10 Anti-Spam Burst Control

Even within limits:

Engine must prevent clustered sends.

Rule:

Minimum gap between sends per mailbox = 2–5 minutes.

Implementation:

Before send:

Check lastSentAt for that mailbox.

If now - lastSentAt < minGap:

Delay lead by remaining gap.

This prevents:

10 emails at same minute

Pattern-based spam detection

3.11 Maximum Active Leads Per Mailbox

Optional safety constraint:

If active leads > 5x dailySendLimit:

Engine must warn (log warning).

This prevents:

1000 active leads with 40 daily limit

Months-long backlogs

3.12 Deliverability Hard Rules

AI-generated email must obey:

1 link max

No tracking-heavy HTML

Plain-text dominant

No all-caps subjects

No spam keywords

No excessive punctuation

This must be part of AI validation layer.

3.13 Deterministic Timing Guarantee

Given:

attemptCount = 3
campaign.baseDelayHours = 24
campaign.escalationMultiplier = 1.5

The engine must always compute the same nextActionAt.

No randomness allowed.

SECTION 3 complete.