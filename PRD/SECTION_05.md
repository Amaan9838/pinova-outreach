📘 SECTION 5 — Angle Rotation System (Per Campaign)

This section defines:

What an angle is technically

How angles are stored

How rotation works

How escalation works

How repetition is prevented

How angle interacts with open/no-open

How angle interacts with cooling cycles

No randomness allowed.

5.1 Definition of Angle (Technical)

An angle is:

A structured persuasion narrative frame applied to an email.

It contains:

Narrative focus

Emotional driver

Value framing

Tone guidance

It does NOT contain:

Prewritten full email body (optional)

Hard-coded delay logic

Conditional flow branching

Angles are strategy objects.
The engine executes them.

5.2 Campaign-Level Angle Schema

Inside Campaign:

angles: [
  {
    key: "pain",
    description: "Highlight operational chaos and lost leads",
  },
  {
    key: "roi",
    description: "Focus on revenue gain and speed-to-lead impact",
  },
  {
    key: "social_proof",
    description: "Mention usage patterns and performance improvement",
  },
  {
    key: "curiosity",
    description: "Ask an intriguing operational question",
  },
  {
    key: "direct_cta",
    description: "Clear and confident meeting request"
  }
]

Rules:

Order matters.

Angles must not be randomly shuffled.

At least 3 angles required per campaign.

Maximum recommended: 7 angles.

5.3 Deterministic Rotation Logic

Rotation formula:

angleIndex = attemptCount % campaign.angles.length

Example:

5 angles:

Attempt 1 → index 0
Attempt 2 → index 1
Attempt 3 → index 2
Attempt 4 → index 3
Attempt 5 → index 4
Attempt 6 → index 0 (cycle restart)

This guarantees:

Predictability

No duplication before cycle ends

Infinite safe looping

5.4 aiMemory Angle Tracking

Inside lead.aiMemory:

{
  lastAngleIndex: number,
  angleHistory: number[]
}

Rules:

After successful send:

Update lastAngleIndex

Push to angleHistory

angleHistory capped at 20 entries.

If restarting cooling cycle:

Reset angleHistory.

5.5 Escalation Model

Persuasion intensity must scale.

Escalation tiers:

if attemptCount == 1 → tone = soft_intro
if attemptCount == 2 → tone = value_reinforcement
if attemptCount == 3 → tone = angle_shift
if attemptCount == 4 → tone = direct_clarity
if attemptCount >= 5 → tone = final_nudge

Escalation level passed to AI:

escalationLevel = min(attemptCount, 5)

AI must adjust tone accordingly.

No regression allowed (cannot go from final_nudge back to soft_intro within same cycle).

5.6 Open vs No-Open Branching

Angle application differs depending on engagement.

Case A: No Open

AI instructions:

Keep body consistent with selected angle.

Regenerate subject line strongly.

Increase curiosity gap.

Avoid mentioning prior email too explicitly.

Case B: Opened but No Reply

AI instructions:

Acknowledge previous message.

Reference value briefly.

Shift persuasion framing.

Slightly stronger CTA.

Open state gives more assertive tone but still professional.

5.7 Objection Mode Override

If reply classified as objection:

Angle rotation temporarily suspended.

Instead:

Use objection-handling template.

After objection email sent:

Resume angle rotation at next index.

Do NOT restart from index 0.

5.8 Cooling Cycle Reset

When cooling period triggered:

attemptCount reset to 0.

angleHistory cleared.

Rotation starts from index 0 again.

Escalation resets to soft_intro.

This makes second cycle feel fresh.

5.9 Repetition Prevention Rules

AI must never:

Repeat same subject twice in a row.

Repeat same CTA wording consecutively.

Use identical first sentence structure.

Use identical angle description back-to-back.

Engine must pass:

previousMessages (last 3)
lastAngleIndex

AI must generate variation.

5.10 AI Fallback Logic

If:

Campaign does not define explicit followup templates
OR

AttemptCount exceeds defined template list

Engine must call:

generateFollowupViaAI()

AI must:

Respect selected angle.

Respect escalation tier.

Maintain continuity.

Avoid repeating prior structure.

No blank followups allowed.

5.11 Subject Line Strategy

Subject line rules:

Must vary every attempt.

Must not exceed 6–8 words.

Must avoid spam words.

Should reflect angle shift.

Examples:

Pain angle → "Quick question about your leads"
ROI angle → "Improving response time?"
Curiosity angle → "How are you tracking inbound?"

Subject randomness prohibited.
It must align with selected angle.

5.12 Long-Term Angle Strategy

If campaign runs long-term:

After multiple cycles:

System must allow admin to update angle list.

New angles apply to future cycles.

Past leads retain existing rotation until next cooling reset.

5.13 Determinism Guarantee

Given:

attemptCount = 3
angles length = 5

Engine must always choose:

angleIndex = 3 % 5 = 3

No randomness.
No A/B inside engine.

If A/B testing desired, it must be implemented as separate campaign.

SECTION 5 complete.