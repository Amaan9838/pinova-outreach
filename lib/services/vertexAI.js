/**
 * AI Service - Claude Haiku 4.5 Integration
 * Handles all AI operations: email generation, reply analysis, insights
 */

import OpenAI from "openai";
import { generateWithClaude } from '../anthropic.js';

const GEMINI_MODEL = "gemini-1.5-flash";
const GEMINI_MODEL_FALLBACK = "gemini-2.0-flash";

class AIService {
  constructor() {
    this.initialized = false;
    this.client = null;
  }

  getOpenAI() {
    if (!this.client) {
      this.client = new OpenAI({
        apiKey: process.env.GEMINI_API_KEY,
        baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/"
      });
    }
    return this.client;
  }

  async initialize() {
    if (this.initialized) return;
    
    try {
      // Test the connection
      this.getOpenAI();
      this.initialized = true;
      console.log('✅ Gemini AI initialized with 2.5 Flash');
    } catch (error) {
      console.error('❌ Gemini AI initialization failed:', error.message);
      throw error;
    }
  }

  /**
   * Generate email variations for A/B testing
   * @param {Object} params - Email generation parameters
   * @returns {Array} Array of email variations
   */
  async generateEmailVariations(params) {
    const { 
      prospect, 
      campaign, 
      previousEmails = [], 
      variationCount = 3,
      purpose = 'follow_up'
    } = params;

    const systemPrompt = `You are an expert cold email copywriter specializing in B2B outreach to real estate agents. 
Your emails are:
- Short and punchy (under 100 words)
- Personalized and relevant
- Have clear, curiosity-inducing subject lines
- End with a soft call-to-action
- Sound human, not salesy

You're reaching out to real estate agents/teams in the US to introduce Pinova Intelligence - an AI platform that helps realtors capture and convert more leads.`;

    const userPrompt = `Create ${variationCount} different email variations for the following scenario:

PROSPECT INFO:
- Name: ${prospect.firstName} ${prospect.lastName || ''}
- Company: ${prospect.company || 'Not specified'}
- Email: ${prospect.email}
- Location: ${prospect.city || prospect.customFields?.find(f => f.name === 'city')?.value || 'Unknown'}
- Notes: ${prospect.personalizationNote || 'None'}

EMAIL PURPOSE: ${purpose}
${purpose === 'follow_up' ? `
PREVIOUS EMAILS SENT:
${previousEmails.map((e, i) => `${i + 1}. Subject: "${e.subject}" (${e.opened ? 'Opened' : 'Not opened'}${e.replied ? ', Replied' : ''})`).join('\n')}
` : ''}

CAMPAIGN THEME: ${campaign.name || 'General Outreach'}
CAMPAIGN PERSONA: ${campaign.persona || 'Real Estate Professional'}

Generate ${variationCount} UNIQUE email variations with different:
1. Subject lines (test different hooks)
2. Opening lines (test different angles)
3. Value propositions (test different benefits)
4. CTAs (test different asks)

Return as JSON array:
[
  {
    "variationName": "Variation A - [brief description]",
    "subject": "Subject line here",
    "body": "Email body here (plain text, use {{first_name}} for personalization)",
    "strategy": "Brief explanation of what this variation tests"
  }
]

IMPORTANT: Each variation should be meaningfully different, not just word swaps.`;

    try {
      const response = await this.callGemini(systemPrompt, userPrompt);
      const parsed = this.parseJSONResponse(response);
      return parsed;
    } catch (error) {
      console.error('Error generating email variations:', error);
      return this.getFallbackVariations(prospect, purpose);
    }
  }

  /**
   * Analyze email reply sentiment and intent
   * @param {Object} params - Reply analysis parameters
   * @returns {Object} Analysis results
   */
  async analyzeReply(params) {
    const { 
      replyContent, 
      originalEmail,
      prospect,
      conversationHistory = []
    } = params;

    const systemPrompt = `You are an expert at analyzing email replies to determine buyer intent and sentiment.
You categorize replies to help sales teams prioritize their time effectively.
Be concise and actionable in your analysis.`;

    const userPrompt = `Analyze this email reply:

ORIGINAL EMAIL SENT:
Subject: ${originalEmail.subject}
Body: ${originalEmail.body?.substring(0, 500)}...

REPLY RECEIVED:
${replyContent}

PROSPECT: ${prospect.firstName} ${prospect.lastName || ''} from ${prospect.company || 'Unknown Company'}

Analyze and return JSON:
{
  "sentiment": "positive|neutral|negative",
  "sentimentScore": <number from -100 to 100>,
  "intent": "interested|needs_more_info|schedule_meeting|not_now|not_interested|out_of_office|referral|question|unknown",
  "keyPhrases": ["phrase1", "phrase2"],
  "urgency": "high|medium|low",
  "suggestedAction": "What should the sales rep do next",
  "suggestedResponse": "Draft a 2-3 sentence response if appropriate",
  "shouldEscalate": <boolean - true if this needs immediate human attention>,
  "notes": "Any other relevant observations"
}`;

    try {
      const response = await this.callGemini(systemPrompt, userPrompt);
      return this.parseJSONResponse(response);
    } catch (error) {
      console.error('Error analyzing reply:', error);
      return {
        sentiment: 'unknown',
        sentimentScore: 0,
        intent: 'unknown',
        keyPhrases: [],
        urgency: 'medium',
        suggestedAction: 'Review manually',
        suggestedResponse: '',
        shouldEscalate: true,
        notes: 'AI analysis failed'
      };
    }
  }

  /**
   * Generate daily insights and recommendations
   * @param {Object} params - Campaign and pipeline data
   * @returns {Array} Array of insights
   */
  async generateDailyInsights(params) {
    const { 
      campaigns,
      pipelineStats,
      recentReplies,
      stalledLeads
    } = params;

    const systemPrompt = `You are an AI sales strategist analyzing outreach campaign performance.
Generate actionable insights that help a small team (2 people) prioritize their day.
Focus on: 1) Immediate opportunities 2) Problems to fix 3) Quick wins.
Be specific and action-oriented.`;

    const userPrompt = `Analyze this data and generate insights:

CAMPAIGN PERFORMANCE (Last 7 days):
${campaigns.map(c => `- ${c.name}: ${c.stats?.sent || 0} sent, ${c.stats?.opened || 0} opens (${Math.round((c.stats?.opened / c.stats?.sent) * 100) || 0}%), ${c.stats?.replied || 0} replies`).join('\n')}

PIPELINE SNAPSHOT:
${Object.entries(pipelineStats).map(([stage, count]) => `- ${stage}: ${count}`).join('\n')}

RECENT REPLIES (Last 48h):
${recentReplies.map(r => `- ${r.prospect}: ${r.sentiment} - "${r.preview?.substring(0, 50)}..."`).join('\n')}

STALLED LEADS (No activity 7+ days):
${stalledLeads.slice(0, 10).map(l => `- ${l.prospect}: Last stage "${l.stage}", Score: ${l.score}`).join('\n')}

Generate 5-7 prioritized insights as JSON array:
[
  {
    "type": "opportunity|warning|recommendation|analysis",
    "priority": "urgent|high|medium|low",
    "title": "Short title",
    "message": "Detailed insight",
    "action": "Specific action to take",
    "impact": "Expected result if action taken"
  }
]

Focus on actionable items for a small team.`;

    try {
      const response = await this.callGemini(systemPrompt, userPrompt);
      return this.parseJSONResponse(response);
    } catch (error) {
      console.error('Error generating insights:', error);
      return [];
    }
  }

  /**
   * Analyze campaign performance and suggest optimizations
   * @param {Object} campaign - Campaign data with stats
   * @returns {Object} Optimization suggestions
   */
  async analyzeCampaignPerformance(campaign) {
    const systemPrompt = `You are a data-driven email marketing analyst.
Analyze campaign metrics and provide specific, actionable recommendations.
Focus on improving: open rates, reply rates, and conversion.`;

    const userPrompt = `Analyze this campaign and suggest optimizations:

CAMPAIGN: ${campaign.name}
TARGET PERSONA: ${campaign.persona}
STATUS: ${campaign.status}
DURATION: ${campaign.startedAt ? Math.round((Date.now() - new Date(campaign.startedAt)) / (1000 * 60 * 60 * 24)) : 0} days

SEQUENCE:
${campaign.sequence?.map((step, i) => `Step ${i + 1}: "${step.subject}" - Delay: ${step.delayDays || 0}d`).join('\n')}

METRICS:
- Total Sent: ${campaign.stats?.sent || 0}
- Delivered: ${campaign.stats?.delivered || 0}
- Opened: ${campaign.stats?.opened || 0} (${Math.round((campaign.stats?.opened / campaign.stats?.sent) * 100) || 0}%)
- Clicked: ${campaign.stats?.clicked || 0} (${Math.round((campaign.stats?.clicked / campaign.stats?.sent) * 100) || 0}%)
- Replied: ${campaign.stats?.replied || 0} (${Math.round((campaign.stats?.replied / campaign.stats?.sent) * 100) || 0}%)
- Bounced: ${campaign.stats?.bounced || 0}

BENCHMARKS:
- Good open rate: 25%+
- Good reply rate: 3%+
- Industry average: 15% open, 1% reply

Provide analysis as JSON:
{
  "overallGrade": "A|B|C|D|F",
  "summary": "One sentence summary",
  "strengths": ["strength1", "strength2"],
  "weaknesses": ["weakness1", "weakness2"],
  "recommendations": [
    {
      "area": "subject_lines|email_body|timing|sequence_length|targeting",
      "issue": "What's wrong",
      "suggestion": "How to fix",
      "expectedImpact": "Expected improvement"
    }
  ],
  "suggestedExperiments": ["experiment1", "experiment2"],
  "urgentActions": ["action if metrics are bad"]
}`;

    try {
      const response = await this.callGemini(systemPrompt, userPrompt);
      return this.parseJSONResponse(response);
    } catch (error) {
      // Silently return null - AI is optional
      return null;
    }
  }

  /**
   * Call AI (Claude or Gemini)
   * @param {string} systemPrompt - System instructions
   * @param {string} userPrompt - User message
   * @returns {string} AI response
   */
  async callGemini(systemPrompt, userPrompt) {
    // Try Gemini first (via OpenAI-compat endpoint)
    if (process.env.GEMINI_API_KEY) {
      const modelsToTry = [GEMINI_MODEL, GEMINI_MODEL_FALLBACK];
      for (const model of modelsToTry) {
        try {
          const openai = this.getOpenAI();
          const response = await openai.chat.completions.create({
            model,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt }
            ],
            temperature: 0.7,
            max_tokens: 4096
          });
          return response.choices[0].message.content.trim();
        } catch (geminiError) {
          console.warn(`⚠️ Gemini model ${model} failed:`, geminiError.message);
          // Try next model
        }
      }
      console.warn('⚠️ All Gemini models failed, trying Claude fallback...');
    }

    // Fallback: Claude via local Python service
    try {
      return await generateWithClaude(`${systemPrompt}\n\n${userPrompt}`);
    } catch (claudeError) {
      console.error('❌ Both Gemini and Claude fallback failed:', claudeError.message);
      throw new Error(`AI_UNAVAILABLE: Gemini and Claude both failed. Check API keys and local AI service.`);
    }
  }


  /**
   * Parse JSON from Claude's response
   */
  parseJSONResponse(response) {
    // If already parsed by Python service
    if (typeof response === 'object') {
      return response;
    }
    
    try {
      let cleaned = response.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      const firstBrace = cleaned.indexOf('{');
      const lastBrace = cleaned.lastIndexOf('}');
      const firstBracket = cleaned.indexOf('[');
      const lastBracket = cleaned.lastIndexOf(']');
      
      if (firstBracket !== -1 && lastBracket !== -1 && (firstBrace === -1 || firstBracket < firstBrace)) {
        cleaned = cleaned.substring(firstBracket, lastBracket + 1);
      } else if (firstBrace !== -1 && lastBrace !== -1) {
        cleaned = cleaned.substring(firstBrace, lastBrace + 1);
      }
      
      return JSON.parse(cleaned);
    } catch (error) {
      console.error('Failed to parse JSON response:', error);
      return null;
    }
  }

  /**
   * Fallback email variations when AI fails
   */
  getFallbackVariations(prospect, purpose) {
    return [
      {
        variationName: "Variation A - Direct Value",
        subject: `Quick question, ${prospect.firstName}`,
        body: `Hi {{first_name}},\n\nI noticed you're in real estate and thought you might be interested in how top agents are using AI to never miss a lead again.\n\nWould you be open to a quick 10-minute call this week?\n\nBest,\n[Your Name]`,
        strategy: "Direct value proposition"
      },
      {
        variationName: "Variation B - Curiosity",
        subject: `${prospect.firstName}, saw something interesting`,
        body: `Hi {{first_name}},\n\nI came across your profile and had a quick thought I'd love to share about lead conversion in your market.\n\nWorth a quick chat?\n\nCheers,\n[Your Name]`,
        strategy: "Curiosity-based approach"
      },
      {
        variationName: "Variation C - Problem-focused",
        subject: `The lead problem every agent faces`,
        body: `Hi {{first_name}},\n\nMost agents lose 78% of incoming leads because they can't respond fast enough.\n\nWe've built something that solves this. Interested in seeing how?\n\nBest,\n[Your Name]`,
        strategy: "Problem-solution approach"
      }
    ];
  }

  /**
   * Generate AI-powered follow-up email based on engagement
   * @param {Object} params - Follow-up generation parameters
   * @returns {Object} Generated follow-up email
   */
  async generateFollowUp(params) {
    const {
      prospect,
      campaign,
      originalEmail,
      openCount = 0,
      daysSinceLastOpen = 1,
      followUpNumber = 1
    } = params;

    const systemPrompt = `You are an expert cold email copywriter specializing in follow-ups.
Your follow-ups are:
- VERY short (max 3 sentences)
- Reference the original email subtly
- Provide NEW value or angle
- Not pushy - they showed interest by opening
- End with a soft, easy CTA
- Sound human and conversational`;

    const userPrompt = `Generate a follow-up email for this scenario:

PROSPECT:
- Name: ${prospect.firstName} ${prospect.lastName || ''}
- Company: ${prospect.company || 'Not specified'}
- Email: ${prospect.email}

ORIGINAL EMAIL:
- Subject: "${originalEmail.subject}"
- Body: "${originalEmail.body}"
- Sent: ${daysSinceLastOpen} day(s) ago

ENGAGEMENT:
- Opened ${openCount} time(s) ${openCount > 2 ? '(HIGH INTEREST!)' : ''}
- No reply yet

FOLLOW-UP #${followUpNumber} of 5

${followUpNumber === 1 ? 'STRATEGY: Gentle nudge + provide additional value' : ''}
${followUpNumber === 2 ? 'STRATEGY: Different angle - ask a question' : ''}
${followUpNumber === 3 ? 'STRATEGY: Share social proof or case study' : ''}
${followUpNumber === 4 ? 'STRATEGY: Last attempt - make it easy to say yes' : ''}
${followUpNumber === 5 ? 'STRATEGY: Final breakup email - give them an out' : ''}

Return ONLY valid JSON:
{
  "subject": "subject line here (max 50 chars)",
  "body": "email body here (max 3 sentences, use {{firstName}} for personalization)"
}`;

    try {
      const response = await this.callGemini(systemPrompt, userPrompt);
      const parsed = this.parseJSONResponse(response);

      if (parsed && parsed.subject && parsed.body) {
        return parsed;
      }
    } catch (error) {
      console.error('Error generating AI follow-up:', error);
    }

    // Fallback follow-ups based on number
    const fallbacks = [
      {
        subject: `Quick follow-up, {{firstName}}`,
        body: `Hi {{firstName}},\n\nJust wanted to circle back on my last email. ${campaign.name ? `I think ${campaign.name} could really help.` : 'Still interested in chatting?'}\n\nLet me know!`
      },
      {
        subject: `Still interested?`,
        body: `Hi {{firstName}},\n\nI know you're busy. Would a quick 10-minute call work better for you?\n\nHappy to work around your schedule.`
      },
      {
        subject: `One last thing, {{firstName}}`,
        body: `Hi {{firstName}},\n\nI don't want to be a pest, but I genuinely think this could help. Worth a quick chat?\n\nNo pressure either way!`
      },
      {
        subject: `Should I close your file?`,
        body: `Hi {{firstName}},\n\nHaven't heard back, so I'm assuming now's not the right time. Should I close your file or circle back in a few months?\n\nJust let me know!`
      },
      {
        subject: `Last email, I promise`,
        body: `Hi {{firstName}},\n\nThis is my last email. If you're not interested, totally understand. If you are, my calendar link is below.\n\nEither way, best of luck!`
      }
    ];

    return fallbacks[Math.min(followUpNumber - 1, 4)];
  }

  /**
   * Categorize email reply into predefined categories for flow routing
   * @param {Object} params - Categorization parameters
   * @returns {Object} Category result with confidence score
   */
  async categorizeReply(params) {
    const {
      replyContent,
      categories,
      confidenceThreshold = 0.7
    } = params;

    const systemPrompt = `You are an expert at categorizing email replies for sales automation.
You must classify each reply into EXACTLY ONE of the provided categories.
Be decisive and confident in your classification.
Consider keywords, tone, and overall intent.`;

    const userPrompt = `Categorize this email reply into one of the following categories:

AVAILABLE CATEGORIES:
${categories.map(c => `- ${c.name} (${c.slug}): ${c.description}
  Keywords: ${c.keywords?.join(', ') || 'none'}`).join('\n')}

EMAIL REPLY TO CATEGORIZE:
"""
${replyContent}
"""

Return ONLY valid JSON:
{
  "category": "<category slug from the list above>",
  "name": "<category name>",
  "confidence": <number between 0 and 1>,
  "reasoning": "<brief explanation of why this category>"
}`;

    try {
      const response = await this.callGemini(systemPrompt, userPrompt);
      const parsed = this.parseJSONResponse(response);
      
      if (parsed && parsed.category) {
        // Validate category exists
        const validCategory = categories.find(c => 
          c.slug === parsed.category || 
          c.name.toLowerCase() === parsed.category.toLowerCase()
        );
        
        if (validCategory) {
          return {
            name: validCategory.name,
            slug: validCategory.slug,
            confidence: parsed.confidence || 0.8,
            reasoning: parsed.reasoning || 'AI categorized'
          };
        }
      }
      
      // Fallback to objection if parsing fails
      return {
        name: 'Objection',
        slug: 'objection',
        confidence: 0.5,
        reasoning: 'Could not determine category, defaulting to objection'
      };
    } catch (error) {
      console.error('Error categorizing reply:', error);
      return {
        name: 'Objection',
        slug: 'objection',
        confidence: 0.3,
        reasoning: 'AI categorization failed',
        error: error.message
      };
    }
  }

  /**
   * Generate response based on reply category
   * @param {Object} params - Response generation parameters
   * @returns {Object} Generated response email
   */
  async generateCategoryResponse(params) {
    const {
      category,
      replyContent,
      prospect,
      campaign,
      responseTemplate
    } = params;

    // If template exists and doesn't use AI, return personalized template
    if (responseTemplate && !responseTemplate.useAI) {
      return {
        subject: this.personalizeTemplate(responseTemplate.subject, prospect),
        body: this.personalizeTemplate(responseTemplate.body, prospect)
      };
    }

    const systemPrompt = `You are a professional sales representative responding to an email reply.
Tone: ${responseTemplate?.aiTone || 'professional'}
${responseTemplate?.aiInstructions || ''}

Keep your response:
- Concise (2-4 sentences max)
- Relevant to what they said
- Moving toward next steps
- Professional but warm`;

    const userPrompt = `Generate a response to this email:

CATEGORY: ${category.name} - ${category.description}

THEIR REPLY:
"""
${replyContent}
"""

PROSPECT: ${prospect.firstName} ${prospect.lastName || ''} from ${prospect.company || 'their company'}
CAMPAIGN: ${campaign.name}

Return ONLY valid JSON:
{
  "subject": "Re: ...",
  "body": "Your response (use {{firstName}} for personalization)"
}`;

    try {
      const response = await this.callGemini(systemPrompt, userPrompt);
      const parsed = this.parseJSONResponse(response);
      
      if (parsed && parsed.body) {
        return {
          subject: parsed.subject || `Re: ${campaign.name}`,
          body: this.personalizeTemplate(parsed.body, prospect)
        };
      }
    } catch (error) {
      console.error('Error generating category response:', error);
    }

    // Fallback response
    return {
      subject: `Re: Follow-up`,
      body: `Hi ${prospect.firstName},\n\nThank you for getting back to me. I'd love to discuss this further.\n\nWould you have time for a quick call this week?\n\nBest regards`
    };
  }

  /**
   * Generate a campaign flow (nodes + edges) from a natural language prompt.
   * @param {string} userPrompt - The user's natural language description of the flow.
   * @returns {Object} { nodes, edges } compatible with React Flow and FlowTemplate schema.
   */
  async generateFlowFromPrompt(userPrompt) {
    const systemPrompt = `You are an expert campaign flow architect. Your job is to convert natural language descriptions into a precise JSON flow structure for email campaign automation.

## VALID NODE TYPES AND THEIR DATA SCHEMAS

### "start" node
{ "label": "Campaign Start" }

### "email" node
{ "subject": "string", "template": "string (can use {{firstName}}, {{company}}, {{lastName}})", "isFirstEmail": boolean }

### "wait" node
{ "duration": number, "unit": "hours" | "days", "businessHoursOnly": boolean }

### "condition" node
{ "conditionType": "email_opened" | "email_not_opened" | "email_replied" | "email_bounced" | "email_clicked" | "no_action_after_wait" | "reply_category", "checkAfter": number (hours), "checkAfterUnit": "hours" | "days", "targetCategory": "string (only for reply_category)" }

### "categorize" node
{ "description": "string", "useAI": true, "confidenceThreshold": 0.7, "fallbackBehavior": "manual_review" }

### "action" node
{ "actionType": "stop_sequence" | "send_response" | "add_tag" | "notify_user" | "schedule_followup", "tagName": "string (for add_tag)", "responseCategory": "string (for send_response)" }

### "end" node
{ "label": "string" }

## EDGES
Edges connect nodes. For condition nodes, use sourceHandle "yes" for the TRUE branch (condition met) and "no" for the FALSE branch.
Edge format: { "id": "unique-string", "source": "node-id", "target": "node-id", "sourceHandle": "yes"|"no"|null, "label": "string|null", "type": "smoothstep", "animated": false }

## POSITIONING RULES
- Start node: x:250, y:0
- Increment y by 140 for each linear step
- For branches (yes/no): yes branch go LEFT (x:80), no branch go RIGHT (x:420), both at same y level
- After re-merging branches, center at x:250 again

## OUTPUT FORMAT
Return ONLY valid JSON. No explanation, no markdown, no code fences — just raw JSON:
{
  "nodes": [ ...node objects with id, type, position, data ],
  "edges": [ ...edge objects ]
}

## RULES
- Always start with a "start" node as the first node (id: "n-start").
- Always end branches with an "end" or "action" (stop_sequence) node.
- Node IDs must be unique strings like "n-email-1", "n-wait-1", "n-cond-1", "n-cat-1", "n-act-1", "n-end-1".
- Condition nodes MUST have both a "yes" and "no" outgoing edge.
- If the user does not specify email content, use sensible placeholder text referencing common B2B outreach.
- If the prompt is not about email campaigns, return: { "error": "Please describe an email campaign flow." }`;

    const userMessage = `Convert this campaign description into a flow JSON:\n\n"${userPrompt}"`;

    try {
      const response = await this.callGemini(systemPrompt, userMessage);
      const parsed = this.parseJSONResponse(response);

      if (!parsed) throw new Error('AI returned invalid JSON');
      if (parsed.error) return { error: parsed.error };
      if (!Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) {
        throw new Error('AI response missing nodes or edges arrays');
      }

      return { nodes: parsed.nodes, edges: parsed.edges };
    } catch (error) {
      console.error('Error generating flow from prompt:', error);
      throw error;
    }
  }

  /**
   * Personalize template with prospect data
   */
  personalizeTemplate(template, prospect) {
    if (!template) return '';
    return template
      .replace(/\{\{firstName\}\}/g, prospect.firstName || '')
      .replace(/\{\{lastName\}\}/g, prospect.lastName || '')
      .replace(/\{\{company\}\}/g, prospect.company || '')
      .replace(/\{\{email\}\}/g, prospect.email || '');
  }
}

// Export singleton instance
export const aiService = new AIService();
export default AIService;
