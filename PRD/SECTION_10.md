📘 SECTION 10 — Minimal Frontend Architecture
Internal Tool UI (Safe, Controlled, No Hidden Logic)

This section defines:

What screens exist

What each screen can do

What each screen must NOT do

How frontend talks to backend

How we prevent scheduling mutation from UI

Frontend is a thin configuration + observability layer.

10.1 Frontend Design Philosophy

The UI must:

✔ Configure campaigns
✔ Configure angles
✔ Configure limits
✔ Import leads
✔ Activate/pause
✔ View logs

The UI must NOT:

✘ Schedule emails
✘ Control delays manually per lead
✘ Allow drag-and-drop flows
✘ Modify nextActionAt
✘ Directly send emails

The UI is declarative.
The engine is imperative.

10.2 Screen 1 — Campaign List

Purpose:
Overview of all campaigns.

Columns:

Name

Status (draft / active / paused)

Mailbox

Daily limit

Active leads

Sent today

Open rate

Reply rate

Bounce rate

Actions:

Create Campaign

Edit

Activate

Pause

View

No send button.
No “run now”.

10.3 Screen 2 — Create / Edit Campaign

Sections:

A. Basic Info

Campaign Name

Goal (text area)

Mailbox (dropdown)

Timezone (US only dropdown)

Business hours

B. Deliverability Settings

Daily send limit

Hourly send limit

Base delay hours (min 24)

Escalation multiplier

Max attempts per cycle

Cooling period days

UI must validate safe ranges.

C. Angle Configuration

Simple ordered list editor:

Example:

Pain-based

ROI-focused

Social proof

Curiosity

Direct CTA

UI Features:

Add angle

Edit description

Reorder via drag handle (reordering allowed)

Delete angle (min 3 enforced)

UI must NOT:

Attach delay per angle

Attach conditional logic per angle

Angles are narrative only.

10.4 Screen 3 — Lead Import

Options:

CSV upload

Manual add

Fields:

Email

Name

Custom initial subject (optional)

Custom initial body (optional)

After import:

Show preview

Confirm

Insert leads with state = new

No scheduling preview.
No timeline chart.

Engine handles timing.

10.5 Screen 4 — Campaign Dashboard

Show:

Total leads

Active leads

Completed

Bounced

Failed

Sent today

Opens

Replies

Bounce rate

Display warning if:

Bounce rate > 5%

Daily limit too high

FailureCount spikes

10.6 Screen 5 — Lead Debug View (Very Important)

This is critical for founder sanity.

For any lead:

Display:

State

Attempt count

Failure count

Last sent

Next action at

Last opened

Replied at

Stop flag

Angle history

Show:

Last 5 sent emails

Reply content

AI classification

EngineLog entries

This screen must make the system explainable.

If a lead misbehaves:
You can inspect it instantly.

10.7 Screen 6 — Engine Logs Viewer

Filterable by:

Campaign

Lead

Date range

State transitions

Each log entry:

State before

State after

Action taken

Angle index

nextActionAt before/after

Error if any

This prevents “I don’t know what happened” anxiety.

10.8 Activation Flow UX

When user clicks Activate:

Show confirmation modal:

“Engine will begin sending gradually based on limits. No bulk sending will occur.”

After activation:

Leads appear as “Scheduled”.

Engine handles distribution.

No timeline preview required.

10.9 Pause Flow UX

When paused:

Show banner: “Campaign paused. No leads will process.”

Do not modify leads.

Engine naturally skips paused campaigns.

Resume:

Simply sets status = active.

10.10 Frontend ↔ Backend Wiring Rules

Frontend must:

Call APIs only.

Never compute nextActionAt.

Never calculate delays.

Never mutate state locally.

All logic lives server-side.

10.11 No Real-Time Sending UI

Do NOT add:

“Send Now” button

“Skip Delay” button

“Force Followup” button

Those reintroduce chaos.

If testing required:
Use internal process-lead endpoint.

10.12 UI Safety Warnings

If:

dailySendLimit > 80

Show warning:
“High send limits may impact deliverability.”

If:

baseDelayHours < 24

Disallow.

If:

angles < 3

Disallow activation.

10.13 Minimalism Over Features

This UI is internal.

No need for:

Visual builders

Fancy analytics charts

A/B testing dashboards

Complex filtering

The power is in the engine.
UI is control panel only.

10.14 Anti-Chaos Reminder

Add comment in frontend code:

// DO NOT implement scheduling logic in frontend.
// All execution logic is server-controlled.

You future-proof yourself from your own creativity.

SECTION 10 complete.