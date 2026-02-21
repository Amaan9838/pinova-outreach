📘 SECTION 7 — Email Sending System
SMTP + Threading + Tracking + Deliverability Discipline

This section defines:

SMTP contract

Structured send result

Failure handling rules

Thread continuity rules

Tracking implementation

Plain-text bias

Anti-spam constraints

7.1 SMTP Service Contract

File:

lib/smtpService.ts

Function:

sendEmail(payload): Promise<SendResult>

Where:

type SendResult = {
  success: boolean
  messageId?: string
  headerMessageId?: string
  error?: string
}

Rules:

SMTP must not mutate any lead state.

SMTP must not retry automatically.

SMTP must not schedule anything.

SMTP must only send and return result.

All decision logic belongs in processLead().

7.2 Required SMTP Payload Structure
{
  mailboxId: ObjectId,
  to: string,
  subject: string,
  body: string,
  threadId?: string,
  inReplyTo?: string,
  references?: string[]
}

Rules:

If first email → no threadId required.

If follow-up → must include threading headers.

7.3 Threading Rules

Threading is critical for inbox placement.

For follow-ups:

Store headerMessageId from initial send.

On next send:

Set In-Reply-To = previous headerMessageId

Set References = previous headerMessageId chain

Maintain same subject with optional minor variation (avoid breaking thread too aggressively).

If subject is changed drastically:

Some clients break thread.

Must be controlled.

Rule:
Subject may vary slightly but must not completely replace topic.

7.4 Message Logging Flow

On successful send:

Create Message document.

Store:

subject

body

headerMessageId

leadId

campaignId

mailboxId

status = "sent"

Append event: { type: "sent", timestamp }

On failure:

Create Message document.

status = "failed"

Store smtpError.

Message must never control state.

7.5 SMTP Failure Handling (Critical)

If send fails:

Engine must:

failureCount++
nextActionAt = now + retryBackoff

Must NOT:

Clear nextActionAt permanently

Advance attemptCount

Change state to contacted

Leave lead in limbo

If failureCount > 5:

state = "failed"
stopFlag = true
nextActionAt = null

No silent halt allowed.

7.6 No Infinite Retry Guarantee

Failure handling must include:

Exponential backoff

Cap at 24h delay

Hard stop after threshold

Engine must not allow:

Reprocessing same failed lead every 5 minutes

nextActionAt stuck in the past

After failure:
nextActionAt must always be in the future.

7.7 Tracking Pixel Implementation

Tracking pixel endpoint:

/api/track/open/:messageId

Rules:

Lightweight 1x1 transparent GIF

No heavy analytics script

No unnecessary cookies

No large tracking URLs

When hit:

Update Message.status = "opened"

Append event: { type: "opened" }

Update lead.lastOpenedAt

Tracking must NOT:

Change lead.state directly

Trigger follow-up immediately

State transition occurs inside processLead().

7.8 Link Tracking Rules

Deliverability protection:

Maximum 1 link per email.

Prefer natural domain (e.g., pinova.ai/demo).

Avoid third-party shorteners.

Avoid heavy tracking parameters.

Avoid multiple CTA links.

Tracking overload increases spam probability.

7.9 Plain-Text Bias Strategy

Emails must:

Be plain text dominant.

Minimal HTML.

No banners.

No styled templates.

No colored buttons.

Structure:

Name,

Short paragraph.

Short paragraph.

One question or CTA.

Signature.

This looks human.
Not marketing automation.

7.10 Minimum Send Gap Enforcement

Before any send:

Check:

lastMailboxSendTime

If:

(now - lastMailboxSendTime) < minimumGapMinutes

Then:

Delay lead by remaining gap.

Exit.

Prevents send clustering.

7.11 Mailbox Status Safety

Before sending:

Confirm mailbox.status = active.

Confirm mailbox.dailySendLimit not exceeded.

Confirm mailbox.hourlySendLimit not exceeded.

If any fail:

Do not send.

Reschedule nextActionAt accordingly.

Never send blindly.

7.12 Bounce Handling

Bounce detection may come from:

IMAP

SMTP error

Delivery failure notice

When bounce confirmed:

Engine must:

state = "bounced"
stopFlag = true
nextActionAt = null

No further attempts allowed.

No AI follow-up allowed.

7.13 Thread Continuity Guarantee

For follow-ups:

If previous message exists:

Must reference previous thread.

Must not break threading unless necessary.

Breaking threads increases spam classification risk.

7.14 Deliverability Health Metrics

Engine must track per mailbox:

Sent count

Open rate

Reply rate

Bounce rate

If bounce rate > threshold (e.g., 5%):

Log warning

Optionally auto-pause campaign

Protect domain reputation.

7.15 Determinism Guarantee

Given:

lead
campaign
mailbox
attemptCount

The engine must deterministically decide:

Whether to send

What subject/body

When nextActionAt is

Whether to stop

No hidden SMTP side effects allowed.

SECTION 7 complete.