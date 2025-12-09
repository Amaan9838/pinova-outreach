/**
 * AI Service - Gemini 2.5 Flash Integration
 * Handles all AI operations: email generation, reply analysis, insights
 * 
 * Budget: $50/month max
 * Model: Gemini 2.5 Flash via OpenAI SDK
 */

import OpenAI from "openai";

// Cost estimates for Gemini 2.5 Flash:
// Input: FREE up to 1M tokens/day
// Output: FREE up to 1M tokens/day
// With $50 budget: Essentially unlimited for this use case!

const GEMINI_MODEL = "gemini-2.5-flash";

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
      console.error('Error analyzing campaign:', error);
      return { overallGrade: 'N/A', summary: 'Analysis unavailable', recommendations: [] };
    }
  }

  /**
   * Call Gemini via OpenAI SDK
   * @param {string} systemPrompt - System instructions
   * @param {string} userPrompt - User message
   * @returns {string} Gemini's response
   */
  async callGemini(systemPrompt, userPrompt) {
    try {
      const openai = this.getOpenAI();
      
      const messages = [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: userPrompt
        }
      ];

      const response = await openai.chat.completions.create({
        model: GEMINI_MODEL,
        messages: messages,
        temperature: 0.7
      });

      return response.choices[0].message.content.trim();
    } catch (error) {
      console.error('Gemini AI call failed:', error);
      throw error;
    }
  }

  /**
   * Parse JSON from Claude's response
   */
  parseJSONResponse(response) {
    try {
      // Try to extract JSON from the response
      const jsonMatch = response.match(/\[[\s\S]*\]|\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return JSON.parse(response);
    } catch (error) {
      console.error('Failed to parse JSON response:', error);
      console.log('Raw response:', response);
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
}

// Export singleton instance
export const aiService = new AIService();
export default AIService;
