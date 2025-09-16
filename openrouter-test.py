import requests
import os

url = "https://openrouter.ai/api/v1/chat/completions"

headers = {
    "Authorization": f"Bearer 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",  # safer
    "Content-Type": "application/json"
}

data = {
    "model": "openrouter/sonoma-sky-alpha",  # free-tier friendly, faster/cheaper
    "messages": [
        {"role": "user", "content": "What is the meaning of life?"}
    ]
}

response = requests.post(url, headers=headers, json=data)
print(response.json())
