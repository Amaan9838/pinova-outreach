import AnthropicFoundry from '@anthropic-ai/foundry-sdk';

const endpoint = "https://amaan-mcf7ntpz-eastus2.services.ai.azure.com/anthropic/";
const deploymentName = "claude-haiku-4-5";
const apiKey = "<your-api-key>";


const client = new AnthropicFoundry({
    apiKey: apiKey,
    baseURL: endpoint,
    apiVersion: "2023-06-01"
});

const message = await client.messages.create({
    model: deploymentName,
    messages: [{ role: "user", content: "What is the capital of France?" }],
    max_tokens: 1024,
});
console.log(message);