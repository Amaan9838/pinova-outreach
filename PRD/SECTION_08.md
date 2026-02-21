📘 SECTION 8 — IMAP & Reply Handling
Clean Event Detection Without State Chaos

This section defines:

How replies are detected

How they are matched

What fields may be mutated

How classification works

Bounce handling

How engine is triggered

What IMAP must NOT do

The biggest rule here:

IMAP is an event notifier.
It is NOT a state machine.

8.1 IMAP Cron Endpoint

Keep:

/api/cron/check-replies

Frequency:
Every 15–30 minutes.

It must:

Connect to mailbox IMAP.

Fetch new messages.

Attempt match.

Update Message logs.

Trigger processLead() if needed.

It must NOT:

Change lead state directly.

Clear scheduling.

Apply business logic.

8.2 Reply Matching Rules (Strict Order)

When new email fetched:

Step 1 — Header Match (Primary)

Check:

inReplyTo

references

Match against:

Message.headerMessageId

If match found → identify leadId.

Step 2 — Fallback Match (Secondary)

If headers missing:

Match by:

Sender email

Most recent sent message from same mailbox to that email

This must be cautious.

Only match if:

Message sent within last 60 days.

Campaign still active.

Avoid accidental cross-thread contamination.

8.3 On Reply Detection — Allowed Mutations

When valid reply found:

IMAP may update:

lead.repliedAt = now
lead.nextActionAt = now

It may NOT:

Set lead.state

Set stopFlag

Increment attemptCount

Decide intent

After updating:

IMAP must enqueue immediate engine processing:

processLead(leadId)

State classification must happen inside engine.

8.4 Reply Classification Flow

Inside processLead():

If:

lead.repliedAt != null

Then:

Call AI classifyReply()

AI returns:

{
  intent,
  objectionType?,
  summary
}

Then engine applies state transition rules (from Section 4).

8.5 Bounce Detection

Bounce may be detected by:

SMTP failure codes

IMAP subject/body analysis (delivery failure)

Provider DSN headers

When bounce confirmed:

IMAP must update:

lead.state = "bounced"
lead.stopFlag = true
lead.nextActionAt = null

And create Message event type = "bounced".

No further engine calls.

Bounce is terminal.

8.6 Stop / Unsubscribe Handling

If reply contains:

"unsubscribe"

"remove me"

"stop contacting"

"not interested, don't email again"

AI classifyReply() must return:

intent = "stop"

Engine then:

lead.state = "stopped"
lead.stopFlag = true
lead.nextActionAt = null

No further attempts.

8.7 Thread Continuity Update

When reply matched:

If threadId exists:

Ensure future follow-ups use same thread.

Store:

lead.threadId = Message.threadId

Thread continuity improves inbox placement.

8.8 No Duplicate Reply Processing

IMAP must ensure idempotency.

Use:

Mailbox.lastProcessedUid

OR

Store processed messageIds.

If same messageId seen again:

Ignore.

Never process same reply twice.

8.9 Reply → Timing Guarantee

When reply detected:

Set:

lead.nextActionAt = now

So engine processes immediately on next cron run.

No delay.

This ensures fast conversational response.

8.10 No Hidden Halt Guarantee

After reply:

There must never be:

repliedAt != null

state unchanged

nextActionAt null

Engine must always transition state.

If corrupted:

Log error

Repair state.

8.11 IMAP Failure Handling

If IMAP connection fails:

Log error

Do not change any lead

Retry next cron cycle

IMAP failure must not halt outreach engine.

8.12 Separation of Concerns

IMAP layer responsibilities:

✔ Detect reply
✔ Match reply
✔ Update timestamps
✔ Log message events

IMAP must NOT:

✘ Decide persuasion logic
✘ Modify attemptCount
✘ Schedule next follow-up
✘ Handle objection responses
✘ Trigger cooling cycles

All of that belongs in processLead().

8.13 Deliverability Safety

Reply detection must not:

Auto-send immediate aggressive reply.

Skip business hour enforcement.

Even after reply:

Engine must still respect business hours.

If reply at 2AM US time:

Schedule response at 9AM US.

This preserves human behavior pattern.

SECTION 8 complete.