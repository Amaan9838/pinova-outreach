from anthropic import AnthropicFoundry
import os

endpoint = "https://amaan-mcf7ntpz-eastus2.services.ai.azure.com/anthropic/"
deployment_name = "claude-haiku-4-5"
api_key = "CRM9J6srQWegihyRNBFZX2r91YLiDArmMddhljmcgfpq2TuFVDe4JQQJ99BFACHYHv6XJ3w3AAAAACOGhPJw"

client = AnthropicFoundry(
    api_key=api_key,
    base_url=endpoint
)

message = client.messages.create(
    model=deployment_name,
    messages=[
        {"role": "user", "content": "What is the capital of France?"}
    ],
    max_tokens=1024,
)

print(message.content)