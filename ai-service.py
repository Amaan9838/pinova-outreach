from anthropic import AnthropicFoundry
from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import re

app = Flask(__name__)
CORS(app)

client = AnthropicFoundry(
    api_key="CRM9J6srQWegihyRNBFZX2r91YLiDArmMddhljmcgfpq2TuFVDe4JQQJ99BFACHYHv6XJ3w3AAAAACOGhPJw",
    base_url="https://amaan-mcf7ntpz-eastus2.services.ai.azure.com/anthropic/"
)

def extract_json(text):
    """Extract and parse JSON from Claude's response"""
    # Remove markdown code blocks
    text = re.sub(r'```json\s*', '', text)
    text = re.sub(r'```\s*', '', text)
    text = text.strip()
    
    # Find JSON object or array
    if '{' in text:
        start = text.index('{')
        end = text.rindex('}') + 1
        json_str = text[start:end]
    elif '[' in text:
        start = text.index('[')
        end = text.rindex(']') + 1
        json_str = text[start:end]
    else:
        json_str = text
    
    return json.loads(json_str)

@app.route('/ai/generate', methods=['POST'])
def generate():
    data = request.json
    prompt = data.get('prompt', '')
    max_tokens = data.get('max_tokens', 2048)
    
    message = client.messages.create(
        model="claude-haiku-4-5",
        messages=[{"role": "user", "content": prompt}],
        max_tokens=max_tokens,
    )
    
    response_text = message.content[0].text
    
    # Try to extract JSON if present
    try:
        parsed = extract_json(response_text)
        return jsonify({"response": response_text, "parsed": parsed})
    except:
        return jsonify({"response": response_text})

if __name__ == '__main__':
    app.run(port=5000)
