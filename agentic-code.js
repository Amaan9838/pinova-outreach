/**
 * Agentic AI Coding Assistant
 * A powerful, interactive AI coding tool using OpenRouter API
 */

const axios = require('axios');
const readline = require('readline');

class AICodeAgent {
    constructor(apiKey, model = 'openrouter/sonoma-sky-alpha') {
        this.apiKey = apiKey || process.env.OPENROUTER_API_KEY;
        if (!this.apiKey) {
            throw new Error('API key required. Set OPENROUTER_API_KEY environment variable or pass apiKey');
        }
        
        this.baseUrl = 'https://openrouter.ai/api/v1/chat/completions';
        this.model = model;
        this.conversationHistory = [];
        this.systemPrompt = `You are an expert coding assistant. You help with:
        - Writing clean, efficient code
        - Debugging and fixing errors
        - Code reviews and optimizations
        - Explaining complex concepts
        - Suggesting best practices
        Always provide clear, well-commented code examples.`;
    }

    async makeRequest(messages) {
        const headers = {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
        };

        const data = {
            model: this.model,
            messages: messages,
            temperature: 0.7,
            max_tokens: 2000
        };

        try {
            const response = await axios.post(this.baseUrl, data, { headers });
            return response.data;
        } catch (error) {
            return { error: `Request failed: ${error.message}` };
        }
    }

    async codeReview(code, language = 'javascript') {
        const prompt = `Please review this ${language} code and provide:
        1. Potential bugs or issues
        2. Performance improvements
        3. Best practice suggestions
        4. Security considerations if applicable
        
        Code:
        \`\`\`${language}
        ${code}
        \`\`\``;

        const messages = [
            { role: 'system', content: this.systemPrompt },
            { role: 'user', content: prompt }
        ];

        const response = await this.makeRequest(messages);
        return this.extractContent(response);
    }

    async generateCode(description, language = 'javascript') {
        const prompt = `Generate ${language} code for the following requirement:
        ${description}
        
        Please include:
        - Clear comments
        - Error handling
        - Example usage if applicable`;

        const messages = [
            { role: 'system', content: this.systemPrompt },
            { role: 'user', content: prompt }
        ];

        const response = await this.makeRequest(messages);
        return this.extractContent(response);
    }

    async debugCode(code, errorMessage, language = 'javascript') {
        const prompt = `Debug this ${language} code that's producing an error:
        
        Code:
        \`\`\`${language}
        ${code}
        \`\`\`
        
        Error message:
        ${errorMessage}
        
        Please identify the issue and provide a fixed version.`;

        const messages = [
            { role: 'system', content: this.systemPrompt },
            { role: 'user', content: prompt }
        ];

        const response = await this.makeRequest(messages);
        return this.extractContent(response);
    }

    async explainCode(code, language = 'javascript') {
        const prompt = `Explain this ${language} code in detail:
        
        \`\`\`${language}
        ${code}
        \`\`\`
        
        Please cover:
        - Overall purpose
        - How it works step by step
        - Key concepts used
        - Potential use cases`;

        const messages = [
            { role: 'system', content: this.systemPrompt },
            { role: 'user', content: prompt }
        ];

        const response = await this.makeRequest(messages);
        return this.extractContent(response);
    }

    async optimizeCode(code, language = 'javascript') {
        const prompt = `Optimize this ${language} code for better performance:
        
        \`\`\`${language}
        ${code}
        \`\`\`
        
        Provide:
        - Optimized version
        - Explanation of improvements
        - Performance comparison if relevant`;

        const messages = [
            { role: 'system', content: this.systemPrompt },
            { role: 'user', content: prompt }
        ];

        const response = await this.makeRequest(messages);
        return this.extractContent(response);
    }

    async chat(message, maintainContext = true) {
        let messages;
        
        if (maintainContext) {
            this.conversationHistory.push({ role: 'user', content: message });
            messages = [{ role: 'system', content: this.systemPrompt }, ...this.conversationHistory];
        } else {
            messages = [
                { role: 'system', content: this.systemPrompt },
                { role: 'user', content: message }
            ];
        }

        const response = await this.makeRequest(messages);
        const content = this.extractContent(response);

        if (maintainContext && content) {
            this.conversationHistory.push({ role: 'assistant', content: content });
        }

        return content;
    }

    clearHistory() {
        this.conversationHistory = [];
        console.log('Conversation history cleared.');
    }

    extractContent(response) {
        if (response.error) {
            return `Error: ${response.error}`;
        }

        try {
            return response.choices[0].message.content;
        } catch (error) {
            return 'Error: Unable to extract response content';
        }
    }

    async interactiveMode() {
        console.log('\n🤖 AI Code Agent - Interactive Mode');
        console.log('='.repeat(50));
        console.log('Commands:');
        console.log('  /review <code>    - Review code');
        console.log('  /generate <desc>  - Generate code from description');
        console.log('  /debug <code>     - Debug code (provide error after)');
        console.log('  /explain <code>   - Explain code');
        console.log('  /optimize <code>  - Optimize code');
        console.log('  /clear           - Clear conversation history');
        console.log('  /exit            - Exit interactive mode');
        console.log('  <message>        - Chat with AI');
        console.log('='.repeat(50));

        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            prompt: '\n> '
        });

        rl.prompt();

        rl.on('line', async (line) => {
            const input = line.trim();

            if (!input) {
                rl.prompt();
                return;
            }

            if (input === '/exit') {
                console.log('Goodbye! 👋');
                rl.close();
                return;
            }

            if (input === '/clear') {
                this.clearHistory();
                rl.prompt();
                return;
            }

            try {
                if (input.startsWith('/')) {
                    const [command, ...contentParts] = input.split(' ');
                    const content = contentParts.join(' ');

                    switch (command) {
                        case '/review':
                            console.log('\n📝 Code Review:');
                            console.log(await this.codeReview(content));
                            break;
                        case '/generate':
                            console.log('\n🔨 Generated Code:');
                            console.log(await this.generateCode(content));
                            break;
                        case '/debug':
                            rl.question('Error message: ', async (errorMsg) => {
                                console.log('\n🐛 Debug Solution:');
                                console.log(await this.debugCode(content, errorMsg));
                                rl.prompt();
                            });
                            return;
                        case '/explain':
                            console.log('\n📚 Code Explanation:');
                            console.log(await this.explainCode(content));
                            break;
                        case '/optimize':
                            console.log('\n⚡ Optimized Code:');
                            console.log(await this.optimizeCode(content));
                            break;
                        default:
                            console.log(`Unknown command: ${command}`);
                    }
                } else {
                    console.log('\n🤖 AI:', await this.chat(input));
                }
            } catch (error) {
                console.error(`Error: ${error.message}`);
            }

            rl.prompt();
        });

        rl.on('close', () => {
            process.exit(0);
        });
    }
}

// Web/Browser version (if not using Node.js)
class AICodeAgentWeb {
    constructor(apiKey, model = 'openrouter/sonoma-sky-alpha') {
        this.apiKey = apiKey;
        this.baseUrl = 'https://openrouter.ai/api/v1/chat/completions';
        this.model = model;
        this.conversationHistory = [];
        this.systemPrompt = `You are an expert coding assistant...`;
    }

    async makeRequest(messages) {
        const response = await fetch(this.baseUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: this.model,
                messages: messages,
                temperature: 0.7,
                max_tokens: 2000
            })
        });

        return await response.json();
    }

    // ... (same methods as above but using fetch instead of axios)
}

// Example usage
async function main() {
    // Set your API key as environment variable or pass directly
    // process.env.OPENROUTER_API_KEY = 'your-api-key-here';

    try {
        const agent = new AICodeAgent(
            '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'
        );

        // Example: Generate code
        console.log('Example - Generating a function:');
        const code = await agent.generateCode('Create a JavaScript function that validates email addresses using regex');
        console.log(code);

        console.log('\n' + '='.repeat(50) + '\n');

        // Example: Review code
        const sampleCode = `
function calculateAverage(numbers) {
    let total = 0;
    for (let i = 0; i < numbers.length; i++) {
        total = total + numbers[i];
    }
    return total / numbers.length;
}`;

        console.log('Example - Code Review:');
        const review = await agent.codeReview(sampleCode);
        console.log(review);

        console.log('\n' + '='.repeat(50) + '\n');

        // Start interactive mode
        await agent.interactiveMode();

    } catch (error) {
        console.error(`Error: ${error.message}`);
        console.log('Please set your OpenRouter API key');
    }
}

// Export for use as module
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AICodeAgent, AICodeAgentWeb };
}

// Run if executed directly
if (require.main === module) {
    main();
}