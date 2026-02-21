📘 SECTION 4 — State Machine Design
Deterministic Lead Lifecycle

This section defines:

Allowed states

Exact transitions

What triggers transitions

Hard stops

No ambiguous movement

No silent progression

Only processLead() may change state.

4.1 Allowed States

The lead runtime (CampaignProspect v2) may only have the following states:

"new"
"contacted"
"opened"
"replied_positive"
"replied_neutral"
"replied_objection"
"bounced"
"completed"
"failed"
"stopped"

No other states are allowed.

No legacy statuses may exist.

4.2 State Definitions
1️⃣ new

Lead has not yet received first email.

Conditions:

attemptCount = 0

lastSentAt = null

nextActionAt = activation time

2️⃣ contacted

At least one email successfully sent.

Conditions:

attemptCount >= 1

lastSentAt != null

repliedAt = null

3️⃣ opened

Lead has opened at least one email but has not replied.

Conditions:

lastOpenedAt != null

repliedAt = null

Note:
State transitions to opened only inside processLead() based on tracking data.
IMAP must not set state directly.

4️⃣ replied_positive

Reply classified as positive intent.

This triggers closing behavior.

5️⃣ replied_neutral

Reply exists but not objection and not strong positive.

6️⃣ replied_objection

Reply classified as objection (budget, timing, competitor, etc.).

7️⃣ bounced

Hard bounce detected.

Must immediately stop scheduling.

8️⃣ completed

Lifecycle finished intentionally.

Example:

Positive conversion

Final close attempt reached

9️⃣ failed

Repeated SMTP failures exceeded threshold.

🔟 stopped

Manually stopped by admin.

4.3 State Transition Table

This is deterministic.

new → contacted

Trigger:
Successful initial email send.

Action:

attemptCount++

lastSentAt = now

nextActionAt = calculated delay

state = contacted

contacted → opened

Trigger:
Message.events shows open
AND repliedAt is null

Action:

state = opened

nextActionAt remains as scheduled

contacted → contacted (followup)

Trigger:
No open, no reply, nextActionAt reached.

Action:

Send followup

attemptCount++

nextActionAt updated

State remains contacted.

opened → contacted (followup)

Trigger:
Opened but no reply, nextActionAt reached.

Action:

Send contextual followup

attemptCount++

nextActionAt updated

state reverts to contacted

(We do not remain permanently in opened.)

contacted/opened → replied_positive

Trigger:
Reply detected and AI classification returns positive.

Action:

state = replied_positive

nextActionAt = now

process closing logic immediately

contacted/opened → replied_neutral

Trigger:
Reply classified neutral.

Action:

state = replied_neutral

nextActionAt = now + delay

contacted/opened → replied_objection

Trigger:
Reply classified objection.

Action:

state = replied_objection

nextActionAt = now

replied_objection → contacted

Trigger:
After objection-handling email sent.

Action:

attemptCount++

nextActionAt = delay

state = contacted

Any → bounced

Trigger:
Bounce detected.

Action:

state = bounced

stopFlag = true

nextActionAt = null

No further transitions allowed.

Any → failed

Trigger:
failureCount > 5

Action:

state = failed

stopFlag = true

nextActionAt = null

Any → stopped

Trigger:
Admin manual stop.

Action:

stopFlag = true

nextActionAt = null

contacted → completed

Trigger:
attemptCount >= maxAttemptsPerCycle
AND coolingPeriod triggered

Action:

nextActionAt = now + coolingPeriodDays

attemptCount reset to 0

state remains contacted

Note:
We do NOT permanently set completed unless campaign intentionally finished.

4.4 Hard Stop Conditions

If state in:

bounced

failed

stopped

completed

Then:

processLead() must immediately exit.

No scheduling allowed.

4.5 Reply Handling Discipline

IMAP may set:

repliedAt

nextActionAt = now

But may NOT set:

replied_positive

replied_objection

replied_neutral

Classification must occur inside processLead().

This keeps one mutation authority.

4.6 No Silent Halt Guarantee

There must never exist a lead where:

state not terminal

stopFlag = false

nextActionAt = null

That is considered corrupted state.

Add validation guard:

If detected:

Log error

Set nextActionAt = now + 24h

4.7 Deterministic Guarantee

Given:

lead.state
lead.attemptCount
lead.repliedAt
lead.lastOpenedAt
campaign settings

The next state must always be predictable.

No randomness.

No hidden conditional services.

4.8 State Machine Safety Checks

Before every send:

Confirm campaign.status = active.

Confirm mailbox.status = active.

Confirm stopFlag = false.

Confirm state not terminal.

If any fail → exit.

4.9 No Dual State Systems

Remove permanently:

sequenceStep

flowNodeId

followUpCount

awaitingReply

any legacy progression field

State machine must have single cursor: state.

SECTION 4 complete.