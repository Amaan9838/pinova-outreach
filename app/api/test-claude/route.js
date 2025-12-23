import { generateWithClaude } from '@/lib/anthropic';

export async function GET() {
    const response = await generateWithClaude("What is the capital of France?");
    console.log(response);
    return Response.json({ response });
}
