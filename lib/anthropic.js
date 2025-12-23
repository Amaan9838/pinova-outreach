export async function generateWithClaude(prompt, maxTokens = 2048) {
    const response = await fetch('http://localhost:5000/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, max_tokens: maxTokens })
    });
    const data = await response.json();
    return data.parsed || data.response;
}
