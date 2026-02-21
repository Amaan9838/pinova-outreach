// -----------------------------------------------------------------------------
// lib/aiService.js - Outreach Engine v2 AI Intelligence Layer
//
// AI responsibilities:
//   1. Generate structured email (subject + body)
//   2. Classify reply intent
//   3. Generate follow-up reply email for positive/objection intents
//
// All timing/state decisions remain in outreachEngine.js -> processLead().
// -----------------------------------------------------------------------------

import AnthropicFoundry from '@anthropic-ai/foundry-sdk';

const FOUNDRY_API_KEY =
  process.env.AZURE_ANTHROPIC_API_KEY ||
  process.env.ANTHROPIC_FOUNDRY_API_KEY;

const FOUNDRY_ENDPOINT =
  process.env.AZURE_ANTHROPIC_ENDPOINT ||
  'https://amaan-mcf7ntpz-eastus2.services.ai.azure.com/anthropic/';

const FOUNDRY_DEPLOYMENT =
  process.env.AZURE_ANTHROPIC_DEPLOYMENT ||
  'claude-haiku-4-5';

const FOUNDRY_API_VERSION =
  process.env.AZURE_ANTHROPIC_API_VERSION ||
  '2023-06-01';

const foundryClient = new AnthropicFoundry({
  apiKey: FOUNDRY_API_KEY,
  baseURL: FOUNDRY_ENDPOINT,
  apiVersion: FOUNDRY_API_VERSION
});

const ESCALATION_TONE = {
  1: 'soft and curious; first reach-out, keep it light and non-salesy',
  2: 'value-focused; reinforce why this is relevant to them specifically',
  3: 'shift angle; try a different framing than before',
  4: 'direct and clear; be concise and confident',
  5: 'final gentle nudge; brief and warm with one clear ask'
};

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

  let historyContext = '';
  if (previousMessages && previousMessages.length > 0) {
    const last3 = previousMessages.slice(0, 3);
    historyContext = `\n\nPrevious emails sent (DO NOT repeat subject, CTA, or opening):\n${last3
      .map((m, i) => `${i + 1}. Subject: "${m.subject}" | Opening: "${(m.body || '').split('\n')[0]}"`)
      .join('\n')}`;
  }

  const openContext = openStatus
    ? '\nThe lead opened a previous email but did not reply. Acknowledge value briefly and shift framing.'
    : '\nThe lead has not opened previous emails. Use a fresh subject line with a curiosity gap.';

  let replyContextStr = '';
  if (replyContext) {
    replyContextStr = `\nThe lead previously replied. Summary: "${replyContext.summary}".${
      replyContext.objectionType
        ? ` Objection type: ${replyContext.objectionType}. Address this concern with empathy.`
        : ''
    }`;
  }

  const systemPrompt = `You are a B2B outreach copywriter. Write emails that sound human and professional.

DELIVERABILITY RULES (non-negotiable):
- Plain text style. No HTML. No markdown. No bullets.
- No emoji.
- No cliches like "I hope this finds you well".
- Avoid spam trigger phrasing.
- Max 1 CTA.
- Body length 120-200 words including sign-off.
- Subject line max 8 words.
- Do not mention AI or automation.

FORMAT: Return STRICT JSON only:
{"subject": "...", "body": "..."}`;

  const userPrompt = `Campaign Goal: ${campaignGoal}

About our product/company:
${knowledgeBase || 'Not provided.'}

Lead Details:
- Name: ${lead.name || 'there'}
- Email: ${lead.email}
- Company: ${lead.company || 'their company'}
${lead.additionalContext ? `- Context: ${lead.additionalContext}` : ''}

Angle to use: "${selectedAngle.key}" - ${selectedAngle.description}
Tone guidance (attempt ${attemptCount}): ${tone}
${historyContext}${openContext}${replyContextStr}

Write the email now. Return only the JSON object.`;

  return await callFoundryWithRetry(systemPrompt, userPrompt, 'email_generation');
}

export async function classifyReply(context) {
  const { rawReply, conversationHistory, campaignGoal } = context;

  let historyContext = '';
  if (conversationHistory && conversationHistory.length > 0) {
    historyContext = `\n\nOriginal outreach emails (context):\n${conversationHistory
      .map((m, i) => `${i + 1}. "${m.subject}": ${(m.body || '').slice(0, 200)}`)
      .join('\n')}`;
  }

  const systemPrompt = `You are a reply intent classifier for a B2B outreach system.

INTENT CATEGORIES:
- "positive": interested, asked for demo/pricing/next steps.
- "neutral": acknowledged but not committed.
- "objection": concern around budget/timing/competitor/disinterest.
- "stop": unsubscribe or do-not-contact request.

If intent is "objection", classify objectionType as one of:
- budget
- timing
- competitor
- not_interested
- other

FORMAT: Return STRICT JSON only:
{"intent":"positive|neutral|objection|stop","objectionType":"budget|timing|competitor|not_interested|other|null","summary":"1-sentence neutral summary"}`;

  const userPrompt = `Campaign Goal: ${campaignGoal}
${historyContext}

--- REPLY EMAIL CONTENT ---
${rawReply}
---

Classify the reply intent. Return only the JSON object.`;

  return await callFoundryWithRetry(systemPrompt, userPrompt, 'reply_classification');
}

export async function generateReplyResponse(context) {
  const { intent, objectionType, replySummary, knowledgeBase, lead, campaignGoal } = context;

  let intentGuidance = 'Respond clearly and professionally.';

  if (intent === 'positive') {
    intentGuidance = 'Lead showed genuine interest. Respond warmly and propose one clear next step.';
  } else if (intent === 'objection') {
    const objectionGuidance = {
      budget:
        'Acknowledge budget concern empathetically and suggest a lower-friction option (pilot/smaller scope/flexible terms).',
      timing:
        'Acknowledge timing and ask what timeline works better, then propose a concrete follow-up.',
      competitor:
        'Acknowledge current setup, avoid competitor bashing, and share one relevant differentiator.',
      not_interested:
        'Respect disinterest, briefly reframe value in one line, and leave a low-pressure door open.',
      other:
        'Address the concern directly and then suggest one next step.'
    };
    intentGuidance = objectionGuidance[objectionType] || objectionGuidance.other;
  }

  const systemPrompt = `You are a senior B2B salesperson writing a reply to an inbound prospect response.

RULES:
- Plain text style. No HTML. No markdown. No bullets.
- No emoji.
- 80-150 words including sign-off.
- Subject should be a short "Re: ..." style subject.
- Max 1 CTA.
- Do not mention AI/automation.

FORMAT: Return STRICT JSON only:
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

  return await callFoundryWithRetry(systemPrompt, userPrompt, 'email_generation');
}

function extractFoundryText(response) {
  if (!response) return '';

  if (typeof response.output_text === 'string' && response.output_text.trim()) {
    return response.output_text.trim();
  }

  if (typeof response.content === 'string' && response.content.trim()) {
    return response.content.trim();
  }

  if (Array.isArray(response.content)) {
    const text = response.content
      .map((part) => {
        if (typeof part === 'string') return part;
        if (part && typeof part.text === 'string') return part.text;
        return '';
      })
      .join('\n')
      .trim();

    if (text) return text;
  }

  return '';
}

function parseJsonFromModelOutput(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    // Handle markdown code fences like ```json ... ```
    const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (fenceMatch?.[1]) {
      return JSON.parse(fenceMatch[1].trim());
    }

    // Fallback: attempt parsing from first JSON object boundaries.
    const firstBrace = raw.indexOf('{');
    const lastBrace = raw.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      return JSON.parse(raw.slice(firstBrace, lastBrace + 1));
    }

    throw new Error('No JSON object found in model response');
  }
}

async function callFoundryWithRetry(systemPrompt, userPrompt, callType) {
  if (!FOUNDRY_API_KEY) {
    throw new Error('Missing AZURE_ANTHROPIC_API_KEY (or ANTHROPIC_FOUNDRY_API_KEY)');
  }

  let lastError;

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const response = await foundryClient.messages.create({
        model: FOUNDRY_DEPLOYMENT,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
        temperature: 0.5,
        max_tokens: 600
      });

      const raw = extractFoundryText(response);
      if (!raw) {
        throw new Error(`Foundry returned empty content for ${callType}`);
      }

      let parsed;
      try {
        parsed = parseJsonFromModelOutput(raw);
      } catch {
        throw new Error(`Foundry returned non-JSON for ${callType}: ${raw.slice(0, 200)}`);
      }

      if (callType === 'email_generation') {
        if (!parsed.subject || typeof parsed.subject !== 'string') {
          throw new Error('Missing or invalid "subject" in AI output');
        }
        if (!parsed.body || typeof parsed.body !== 'string') {
          throw new Error('Missing or invalid "body" in AI output');
        }
        if (parsed.body.split(/\s+/).length < 30) {
          throw new Error('AI body too short (< 30 words)');
        }

        parsed.body = parsed.body.replace(/<[^>]*>/g, '').trim();
        parsed.subject = parsed.subject.replace(/<[^>]*>/g, '').trim();
      }

      if (callType === 'reply_classification') {
        const validIntents = ['positive', 'neutral', 'objection', 'stop'];
        if (!validIntents.includes(parsed.intent)) {
          throw new Error(`Invalid intent: ${parsed.intent}`);
        }

        if (!parsed.summary || typeof parsed.summary !== 'string') {
          parsed.summary = 'No summary available.';
        }

        if (!parsed.objectionType || parsed.objectionType === 'null') {
          parsed.objectionType = null;
        }
      }

      return parsed;
    } catch (err) {
      lastError = err;
      console.warn(`[aiService] ${callType} attempt ${attempt} failed: ${err.message}`);
      if (attempt < 2) {
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
    }
  }

  throw lastError;
}
