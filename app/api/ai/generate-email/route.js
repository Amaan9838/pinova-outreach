import { aiService } from '../../../../lib/services/vertexAI.js';

export async function POST(request) {
  try {
    const { goal, prospectSample } = await request.json();
    
    if (!goal) {
      return Response.json({ success: false, error: 'Goal is required' }, { status: 400 });
    }

    // Initialize AI service
    await aiService.initialize();

    const prompt = `You are an expert cold email copywriter. Write a short, effective cold email.

GOAL: ${goal}

RULES:
- Subject line: Max 50 characters, intriguing, no spam words
- Body: Max 4 sentences total
- Use {{firstName}} for personalization
- Use {{company}} if relevant
- End with a soft CTA (suggest a quick call)
- Sound human, not salesy
- No fluff or corporate speak

Return ONLY valid JSON in this format:
{
  "subject": "subject line here",
  "body": "email body here"
}`;

    const response = await aiService.callGemini(prompt, {
      temperature: 0.7,
      maxTokens: 500
    });

    // Parse the response
    try {
      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return Response.json({
          success: true,
          subject: parsed.subject,
          body: parsed.body
        });
      }
    } catch (parseErr) {
      console.error('Failed to parse AI response:', parseErr);
    }

    // Fallback if parsing fails
    return Response.json({
      success: true,
      subject: `Quick question about {{company}}`,
      body: `Hi {{firstName}},\n\n${goal}\n\nWould you be open to a quick 10-minute chat this week?\n\nBest,\n[Your Name]`
    });

  } catch (error) {
    console.error('AI email generation error:', error);
    
    // Always return a usable fallback
    const { goal } = await request.json().catch(() => ({ goal: '' }));
    return Response.json({
      success: true,
      subject: `Quick question for you`,
      body: `Hi {{firstName}},\n\n${goal || 'I wanted to reach out about an opportunity.'}\n\nWould you have time for a quick call?\n\nBest,\n[Your Name]`
    });
  }
}
