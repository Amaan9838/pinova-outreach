import { aiService } from '../../../../lib/services/vertexAI.js';

/**
 * AI Flow Generator API
 * POST /api/ai/generate-flow
 * Body: { prompt: string }
 * Returns: { nodes, edges } or { error: string }
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { prompt } = body;

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length < 10) {
      return Response.json(
        { error: 'Please provide a clear description of your campaign flow (at least 10 characters).' },
        { status: 400 }
      );
    }

    await aiService.initialize();

    const result = await aiService.generateFlowFromPrompt(prompt.trim());

    if (result.error) {
      return Response.json({ error: result.error }, { status: 422 });
    }

    return Response.json({
      success: true,
      nodes: result.nodes,
      edges: result.edges,
    });

  } catch (error) {
    console.error('Generate flow error:', error.message);
    return Response.json(
      { error: `Failed to generate flow: ${error.message}. Please try again or rephrase your description.` },
      { status: 500 }
    );
  }
}
