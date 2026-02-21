// ─────────────────────────────────────────────────────────────────────────────
// lib/aiService.js — Outreach Engine v2 AI Intelligence Layer
//
// AI has exactly 3 responsibilities (PRD §6.1):
//   1. Generate structured email (subject + body)
//   2. Classify reply intent
//   3. Summarize reply context for memory
//
// AI does NOT:
//   - Decide timing
//   - Decide state transitions
//   - Override scheduling
//
// All decisions remain in outreachEngine.js → processLead().
//
// PRD Reference: §6 (AI Integration Layer)
// ─────────────────────────────────────────────────────────────────────────────

import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ─────────────────────────────────────────────────────────────────────────────
// Escalation tone labels (PRD §5.5)
// ─────────────────────────────────────────────────────────────────────────────
const ESCALATION_TONE = {
  1: 'soft and curious — this is your first reach-out, keep it light and non-salesy',
  2: 'value-focused — reinforce what makes this relevant to them specifically',
  3: 'shift angle — try a different framing or emotional hook than before',
  4: 'direct and clear — be concise and confident, clearly state what you want',
  5: 'final gentle nudge — brief, warm, acknowledge they may be busy, one last ask'
};

// ─────────────────────────────────────────────────────────────────────────────
// §6.2, §6.3, §6.4 — Email Generation
//
// Input: structured context object (PRD §6.2)
// Output: { subject: string, body: string }
//
// Contract:
//   - Subject ≤ 8 words
//   - Body 120–200 words
//   - Plain text dominant (no HTML, no markdown in body)
//   - Max 1 CTA
//   - JSON only, no commentary
// ─────────────────────────────────────────────────────────────────────────────
export async function generateTargetedEmail(context) {
  const {
    campaignGoal,
    knowledgeBase,
    lead,
    selectedAngle,
    escalationLevel,
    attemptCount,
    previousMessages,
    openStatus,
    replyContext
  } = context;

  const tone = ESCALATION_TONE[escalationLevel] || ESCALATION_TONE[5];

  // Build conversation history context (PRD §5.9)
  let historyContext = '';
  if (previousMessages && previousMessages.length > 0) {
    const last3 = previousMessages.slice(0, 3);
    historyContext = `\n\nPrevious emails sent (DO NOT repeat these subjects, CTAs, or opening lines):\n${last3.map((m, i) => `${i + 1}. Subject: "${m.subject}" | Opening line: "${m.body?.split('\n')[0] || ''}"`).join('\n')}`;
  }

  // Open behavior context (PRD §5.6)
  let openContext = openStatus
    ? '\nThe lead has opened a previous email but has not replied. Acknowledge the value briefly and shift framing.'
    : '\nThe lead has not opened previous emails. Use a strong, fresh subject line with a curiosity gap.';

  // Reply/objection context (PRD §6.7)
  let replyContextStr = '';
  if (replyContext) {
    replyContextStr = `\nThe lead previously replied. Summary: "${replyContext.summary}".${
      replyContext.objectionType ? ` Objection type: ${replyContext.objectionType}. Address this concern with empathy.` : ''
    }`;
  }

  const systemPrompt = `You are a B2B outreach copywriter. You write emails that sound like they were personally written by a human professional — not by a tool.

DELIVERABILITY RULES (non-negotiable):
- Write in plain text style. No HTML. No markdown. No bullet points.
- No emoji.
- No "I hope this finds you well" or other clichés.
- No spam trigger words (free, guaranteed, limited time, act now, click here).
- No all-caps words.
- No excessive punctuation (! or ?).
- Max 1 link or CTA. Be clear, not pushy.
- Body must be 120–200 words including signature sign-off.
- Subject line max 8 words.
- Do not mention "AI", "automation tool", or overuse the word "revenue."

FORMAT: Return STRICT JSON only. No explanation, no markdown, no preamble:
{"subject": "...", "body": "..."}`;

  const userPrompt = `Campaign Goal: ${campaignGoal}

About our product/company:
${knowledgeBase || 'Not provided.'}

Lead Details:
- Name: ${lead.name || 'there'}
- Email: ${lead.email}
- Company: ${lead.company || 'their company'}
${lead.additionalContext ? `- Context: ${lead.additionalContext}` : ''}

Angle to use: "${selectedAngle.key}" — ${selectedAngle.description}

Tone guidance (attempt ${attemptCount}): ${tone}
${historyContext}${openContext}${replyContextStr}

Write the email now. Return only the JSON object.`;

  return await callOpenAIWithRetry(systemPrompt, userPrompt, 'email_generation');
}

// ─────────────────────────────────────────────────────────────────────────────
// §6.6, §8.4 — Reply Classification
//
// Input: { rawReply, conversationHistory, campaignGoal }
// Output: { intent, objectionType?, summary }
//
// Intent values: positive | neutral | objection | stop
// ─────────────────────────────────────────────────────────────────────────────
export async function classifyReply(context) {
  const { rawReply, conversationHistory, campaignGoal } = context;

  let historyContext = '';
  if (conversationHistory && conversationHistory.length > 0) {
    historyContext = `\n\nOriginal outreach emails (for context):\n${
      conversationHistory.map((m, i) => `${i + 1}. "${m.subject}": ${m.body?.slice(0, 200)}`).join('\n')
    }`;
  }

  const systemPrompt = `You are a reply intent classifier for a B2B outreach system.

Your job is to read a reply email and classify the sender's intent.

INTENT CATEGORIES:
- "positive": Interested, asking for a demo, pricing, or next steps. Any signal of genuine engagement.
- "neutral": Acknowledged the email but not committed. Vague replies like "thanks" or "will keep in mind."
- "objection": Raising a concern — budget ("too expensive"), timing ("not now"), competitor ("using X"), or general disinterest.
- "stop": Unsubscribe request, "remove me", "stop emailing", "not interested, don't contact me again."

If intent is "objection", classify the objection type:
- "budget" — cost or pricing concern
- "timing" — not a good time, come back later
- "competitor" — using a competitor product
- "not_interested" — general disinterest
- "other" — any other objection

FORMAT: Return STRICT JSON only. No explanation, no markdown:
{"intent": "positive|neutral|objection|stop", "objectionType": "budget|timing|competitor|not_interested|other|null", "summary": "1-sentence neutral summary of the reply"}`;

  const userPrompt = `Campaign Goal: ${campaignGoal}
${historyContext}

--- REPLY EMAIL CONTENT ---
${rawReply}
---

Classify the reply intent. Return only the JSON object.`;

  return await callOpenAIWithRetry(systemPrompt, userPrompt, 'reply_classification');
}

// ─────────────────────────────────────────────────────────────────────────────
// §6.7 — Reply Response Generation
//
// Input: { intent, objectionType?, replySummary, knowledgeBase, lead, campaignGoal }
// Output: { subject: string, body: string }
//
// Used by the engine after classifying a reply as positive or objection.
// The engine sends the result as the next email in the thread.
// ─────────────────────────────────────────────────────────────────────────────
export async function generateReplyResponse(context) {
  const { intent, objectionType, replySummary, knowledgeBase, lead, campaignGoal } = context;

  let intentGuidance;
  if (intent === 'positive') {
    intentGuidance = `The lead has shown genuine interest or asked for more info. Your job is to respond warmly, confirm their interest, and propose a clear next step (e.g. a short call, demo, or sending a detailed overview). Keep it concise and action-oriented.`;
  } else if (intent === 'objection') {
    const objMap = {
      budget:       'They have budget concerns. Acknowledge it empathetically, offer flexibility (e.g. a smaller scope, pilot, or flexible terms), and keep the door open.',
      timing:       'The timing is not right for them. Acknowledge that, briefly restate the value, and ask what timeline would work better — then set a specific follow-up.',
      competitor:   'They are using a competitor. Do not bash the competitor. Acknowledge their current setup and briefly highlight one concrete differentiator that is relevant to their situation.',
      not_interested: 'They expressed general disinterest. Respect that, briefly reframe the value in a single sentence, and leave a very low-friction door open (e.g. "Happy to reconnect in 3 months if anything changes").',
      other:        'They raised a concern or question. Address it directly and concisely, then steer back toward a next step.'
    };
    intentGuidance = objMap[objectionType] || objMap.other;
  }

  const systemPrompt = `You are a senior B2B sales professional writing a reply to a prospect who has responded to an outreach email.

DELIVERABILITY RULES (non-negotiable):
- Plain text style. No HTML. No markdown. No bullet points.
- No emoji.
- No clichés.
- 80–150 words including sign-off.
- Subject line: reply to existing subject (prefix "Re: " followed by a short summary).
- Max 1 CTA. Be human, specific, and low-pressure.
- Do not reveal that you are AI or automated.

FORMAT: Return STRICT JSON only. No explanation, no markdown, no preamble:
{"subject": "Re: ...", "body": "..."}`;

  const userPrompt = `Campaign Goal: ${campaignGoal}

About our product/company:
${knowledgeBase || 'Not provided.'}

Lead Details:
- Name: ${lead.name || 'there'}
- Company: ${lead.company || 'their company'}

What the lead said (summary): "${replySummary}"

How to respond: ${intentGuidance}

Write the reply email now. Return only the JSON object.`;

  return await callOpenAIWithRetry(systemPrompt, userPrompt, 'email_generation');
}

// If AI returns malformed JSON, retries once. Throws on second failure.
// ─────────────────────────────────────────────────────────────────────────────
async function callOpenAIWithRetry(systemPrompt, userPrompt, callType) {
  let lastError;

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        temperature: 0.5, // PRD §6.12 — keep stable, not too random
        max_tokens: 600,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user',   content: userPrompt }
        ],
        response_format: { type: 'json_object' } // Force JSON mode
      });

      const raw = response.choices[0]?.message?.content?.trim();
      if (!raw) throw new Error(`OpenAI returned empty content for ${callType}`);

      let parsed;
      try {
        parsed = JSON.parse(raw);
      } catch {
        throw new Error(`OpenAI returned non-JSON for ${callType}: ${raw.slice(0, 200)}`);
      }

      // Validate required fields per contract (PRD §6.3, §6.6)
      if (callType === 'email_generation') {
        if (!parsed.subject || typeof parsed.subject !== 'string') throw new Error('Missing or invalid "subject" in AI output');
        if (!parsed.body || typeof parsed.body !== 'string') throw new Error('Missing or invalid "body" in AI output');
        if (parsed.body.split(/\s+/).length < 30) throw new Error('AI body too short (< 30 words)');
        // Sanitize: strip any markdown headers or HTML that snuck through
        parsed.body = parsed.body.replace(/<[^>]*>/g, '').trim();
        parsed.subject = parsed.subject.replace(/<[^>]*>/g, '').trim();
      }

      if (callType === 'reply_classification') {
        const validIntents = ['positive', 'neutral', 'objection', 'stop'];
        if (!validIntents.includes(parsed.intent)) throw new Error(`Invalid intent: ${parsed.intent}`);
        if (!parsed.summary || typeof parsed.summary !== 'string') parsed.summary = 'No summary available.';
        if (parsed.objectionType === 'null') parsed.objectionType = null;
      }

      return parsed;

    } catch (err) {
      lastError = err;
      console.warn(`[aiService] ${callType} attempt ${attempt} failed: ${err.message}`);
      if (attempt < 2) {
        // Small delay before retry
        await new Promise(r => setTimeout(r, 1500));
      }
    }
  }

  throw lastError;
}
