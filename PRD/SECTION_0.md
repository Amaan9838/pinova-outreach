📘 SECTION 0 — Vision & Constraints
Pinova Outreach Engine v2

This section defines the philosophical and architectural foundation.

The AI coding agent must treat this as immutable design law.

0.1 System Objective

Build a deterministic, lead-centric, deliverability-safe outreach engine that:

Operates as a state machine per lead.

Uses exactly one scheduling authority (nextActionAt).

Uses one mailbox per campaign.

Supports per-campaign persuasion angles.

Supports AI-generated hyper-personalized emails.

Allows long-term structured followups.

Protects domain reputation.

Prevents silent halts and infinite retry loops.

Is fully explainable and auditable.

This engine is internal revenue infrastructure for Pinova Intelligence.

It is NOT a general marketing automation platform.

It is NOT a visual workflow builder.

It is NOT a bulk email sender.

0.2 Non-Negotiable Architectural Rules

The AI agent must enforce these constraints:

Only one cron endpoint controls scheduling.

Only one field (nextActionAt) controls timing.

Only one function (processLead()) mutates state.

No parallel scheduling engines.

No duplicate cursors (no sequenceStep, no currentFlowNodeId).

IMAP must not mutate state directly.

SMTP failures must never orphan a lead.

Bounce must always stop scheduling.

No automatic mailbox fallback.

No hidden DB writes outside engine logic.

If any feature conflicts with these rules, the feature must be rejected.

0.3 Deliverability-First Philosophy

Deliverability is more important than volume.

The engine must optimize for:

Inbox placement

Domain health

Mailbox longevity

Human-like cadence

The engine must avoid:

Rapid bursts

Identical repetitive content

High-frequency followups

Aggressive CTA stacking

Spam keyword density

Excessive link inclusion

This system must behave like a disciplined human SDR.

Not like automation software.

0.4 Timezone & US Delivery Strategy (India → US)

Context:

Founders operate from India.

Customers are in the United States.

Emails must feel locally sent.

Rules:

Every campaign must define a US timezone.

All scheduling must be calculated in campaign timezone.

Emails must only send during allowed business hours.

Default business hours:

9:00 AM – 5:00 PM (campaign timezone)

No sending outside business hours.

If nextActionAt falls outside business hours:

Reschedule to next valid business window.

All time calculations must convert to campaign timezone before execution.

Server timezone must never be used directly.

0.5 What This System Is NOT

The engine must NOT:

Reintroduce flow builder logic.

Store sequence arrays.

Allow multiple followup systems.

Pre-schedule all emails at campaign start.

Allow uncontrolled infinite retries.

Allow AI to send without deterministic angle control.

Allow per-email manual scheduling overrides.

Allow hidden mutation via UI actions.

The system must remain predictable.

0.6 Definition of “Infinite Followup”

“Infinite” does NOT mean aggressive spam.

It means:

Long-term structured persistence.

Controlled cadence.

Angle rotation.

Cooling periods.

Deliverability-aware spacing.

The engine must support:

Followup cycles like:

Cycle 1 → 5–7 attempts
Cooling period → 30 days
Cycle 2 → new angle rotation

Persistence without reputation damage.

0.7 Definition of “Angle”

An angle is:

A defined persuasion narrative used to frame the outreach.

Each campaign defines its own ordered list of angles.

Angle rotation must be:

Deterministic

Sequential

Non-random

Logged

Angles are campaign-level strategy.
Not per-email randomness.

0.8 Determinism Requirement

For any lead, at any moment, the system must be able to answer:

Why was this email sent?

Why at this time?

Why with this angle?

Why with this delay?

What will happen next?

If the answer is not explainable via state + rules, the architecture is wrong.

0.9 Safety Guarantees

The final system must guarantee:

No silent dead leads.

No infinite send loops.

No duplicate cron conflicts.

No mailbox cross-contamination.

No uncontrolled send bursts.

No broken state transitions.

If any of these occur, it is considered a critical architecture failure.

0.10 Success Definition

Outreach Engine v2 is successful when:

The entire lifecycle of a lead can be reconstructed from logs.

Scheduling behavior is fully predictable.

Deliverability is stable.

AI output is structured and controlled.

Removing or adding a feature does not destabilize scheduling.

SECTION 0 is complete.
