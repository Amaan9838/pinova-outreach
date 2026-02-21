📘 SECTION 6 — AI Integration Layer
Structured Intelligence, Not Free Writing

This section defines:

What AI is allowed to do

What AI is NOT allowed to do

Input contract

Output contract

Reply classification rules

Follow-up fallback rules

Memory handling

Deliverability-safe constraints

AI is a reasoning engine.
Not an autonomous decision-maker.

All decisions remain in processLead().

6.1 Role of AI in Outreach Engine v2

AI has exactly 3 responsibilities:

Generate structured email (subject + body).

Classify reply intent.

Summarize reply context for memory.

AI does NOT:

Decide timing.

Decide state transitions.

Decide retry behavior.

Decide cooling cycles.

Override scheduling.

AI is a controlled content module.

6.2 AI Input Contract — Email Generation

When generating any email, the engine must send structured input:

{
  campaignGoal: string,
  knowledgeBase: string,

  lead: {
    name: string,
    email: string,
    company?: string,
    additionalContext?: string
  },

  selectedAngle: {
    key: string,
    description: string
  },

  escalationLevel: number,  // 1–5

  attemptCount: number,

  previousMessages: [
    {
      subject: string,
      body: string
    }
  ],

  openStatus: boolean,

  replyContext?: {
    rawReply: string,
    summary?: string,
    objectionType?: string
  }
}

No other fields allowed.

No internal DB objects passed directly.

6.3 AI Output Contract — Strict JSON Only

AI must return:

{
  subject: string,
  body: string,

  intent?: "positive" | "neutral" | "objection" | "stop",

  objectionType?: "budget" | "timing" | "competitor" | "not_interested" | "other",

  summary?: string
}

Rules:

No markdown.

No HTML wrappers.

No extra commentary.

Must be valid JSON.

Subject must not exceed 8 words.

Body must be under 180–220 words.

If output invalid:

Engine retries once.

If still invalid → mark failure.

6.4 Email Generation Rules

AI must:

Align with selectedAngle.description.

Escalate tone based on escalationLevel.

Avoid repeating prior structure.

Maintain continuity with previousMessages.

Include only one link maximum.

Prefer plain-text formatting.

AI must NOT:

Use spam words.

Overuse punctuation.

Use aggressive scarcity tactics.

Mention “AI automation tool”.

Overpromise capabilities.

Invent fake case studies.

6.5 Follow-Up Fallback Logic

If campaign has no predefined template for current attempt:

Engine calls:

generateFollowupViaAI()

Rules:

Must respect angle rotation.

Must escalate slightly.

Must not feel identical to previous.

Must contain contextual reference if opened.

No silent skip allowed.

6.6 Reply Classification Contract

When reply detected:

Engine calls:

classifyReply()

AI input:

{
  rawReply: string,
  conversationHistory: previousMessages,
  campaignGoal: string
}

AI must return:

{
  intent: "positive" | "neutral" | "objection" | "stop",
  objectionType?: string,
  summary: string
}

Intent mapping rules:

positive → Interested, asks for demo, asks questions.

neutral → Acknowledges but non-committal.

objection → Budget, timing, competitor, not priority.

stop → Unsubscribe, remove me, do not contact.

6.7 Objection Handling Mode

If intent = objection:

Engine must:

Store objectionType.

Immediately call generateEmail().

Provide replyContext with objectionType.

Skip angle rotation for that attempt.

Resume rotation next attempt.

Objection-handling email must:

Acknowledge concern.

Provide concise response.

Offer low-friction next step.

Not aggressive.

6.8 Stop Intent Handling

If intent = stop:

Engine must:

state = stopped

stopFlag = true

nextActionAt = null

No further AI generation.

No followups.

6.9 AI Memory Handling

Inside lead.aiMemory:

{
  lastAngleIndex,
  angleHistory,
  sentiment,
  objectionType,
  replySummary
}

After each reply classification:

sentiment stored.

replySummary stored.

objectionType stored if present.

Memory must be passed in future prompts.

6.10 Deliverability-Safe Prompt Constraints

Every AI email generation must include internal constraints:

Write in plain text style.

Avoid spam-trigger words.

Use conversational tone.

Avoid excessive formatting.

No emoji.

One CTA maximum.

No all caps.

No fake urgency.

This must be part of system prompt.

6.11 AI Error Handling

If AI:

Returns malformed JSON

Returns empty subject

Returns body < 50 words

Returns spammy content

Engine must:

Retry once.

If still invalid → mark failureCount++.

Apply retryBackoff.

No uncontrolled behavior allowed.

6.12 Determinism Guarantee

Given same:

campaign settings

lead data

angle

escalation level

AI prompt must be structured consistently.

Minor wording differences allowed.
Structural randomness not allowed.

No temperature > moderate (keep stable).

6.13 Cost & Performance Consideration

AI calls must be:

One call per send.

One call per reply classification.

Not called during scheduling checks.

Not called unnecessarily.

No polling AI every cron.