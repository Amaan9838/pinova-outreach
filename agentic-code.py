"""
Agentic AI Coding Assistant
A powerful, interactive AI coding tool using OpenRouter API
"""

import requests
import json
import os
import sys
from typing import List, Dict, Optional
from datetime import datetime
import time

class AICodeAgent:
    """An intelligent coding assistant that can help with various programming tasks"""
    
    def __init__(self, api_key: Optional[str] = None, model: str = "openrouter/sonoma-sky-alpha"):
        """
        Initialize the AI Code Agent
        
        Args:
            api_key: OpenRouter API key (uses environment variable if not provided)
            model: Model to use for completions
        """
        self.api_key = api_key or os.getenv("OPENROUTER_API_KEY")
        if not self.api_key:
            raise ValueError("API key required. Set OPENROUTER_API_KEY environment variable or pass api_key")
        
        self.base_url = "https://openrouter.ai/api/v1/chat/completions"
        self.model = model
        self.conversation_history = []
        self.system_prompt = """You are an expert coding assistant. You help with:
        - Writing clean, efficient code
        - Debugging and fixing errors
        - Code reviews and optimizations
        - Explaining complex concepts
        - Suggesting best practices
        Always provide clear, well-commented code examples."""
        
    def _make_request(self, messages: List[Dict]) -> Dict:
        """Make API request to OpenRouter"""
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        data = {
            "model": self.model,
            "messages": messages,
            "temperature": 0.7,
            "max_tokens": 2000
        }
        
        try:
            response = requests.post(self.base_url, headers=headers, json=data)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            return {"error": f"Request failed: {str(e)}"}
    
    def code_review(self, code: str, language: str = "python") -> str:
        """Review code and suggest improvements"""
        prompt = f"""Please review this {language} code and provide:
        1. Potential bugs or issues
        2. Performance improvements
        3. Best practice suggestions
        4. Security considerations if applicable
        
        Code:
        ```{language}
        {code}
        ```"""
        
        messages = [
            {"role": "system", "content": self.system_prompt},
            {"role": "user", "content": prompt}
        ]
        
        response = self._make_request(messages)
        return self._extract_content(response)
    
    def generate_code(self, description: str, language: str = "python") -> str:
        """Generate code based on description"""
        prompt = f"""Generate {language} code for the following requirement:
        {description}
        
        Please include:
        - Clear comments
        - Error handling
        - Example usage if applicable"""
        
        messages = [
            {"role": "system", "content": self.system_prompt},
            {"role": "user", "content": prompt}
        ]
        
        response = self._make_request(messages)
        return self._extract_content(response)
    
    def debug_code(self, code: str, error_message: str, language: str = "python") -> str:
        """Debug code with error message"""
        prompt = f"""Debug this {language} code that's producing an error:
        
        Code:
        ```{language}
        {code}
        ```
        
        Error message:
        {error_message}
        
        Please identify the issue and provide a fixed version."""
        
        messages = [
            {"role": "system", "content": self.system_prompt},
            {"role": "user", "content": prompt}
        ]
        
        response = self._make_request(messages)
        return self._extract_content(response)
    
    def explain_code(self, code: str, language: str = "python") -> str:
        """Explain what code does in detail"""
        prompt = f"""Explain this {language} code in detail:
        
        ```{language}
        {code}
        ```
        
        Please cover:
        - Overall purpose
        - How it works step by step
        - Key concepts used
        - Potential use cases"""
        
        messages = [
            {"role": "system", "content": self.system_prompt},
            {"role": "user", "content": prompt}
        ]
        
        response = self._make_request(messages)
        return self._extract_content(response)
    
    def optimize_code(self, code: str, language: str = "python") -> str:
        """Optimize code for better performance"""
        prompt = f"""Optimize this {language} code for better performance:
        
        ```{language}
        {code}
        ```
        
        Provide:
        - Optimized version
        - Explanation of improvements
        - Performance comparison if relevant"""
        
        messages = [
            {"role": "system", "content": self.system_prompt},
            {"role": "user", "content": prompt}
        ]
        
        response = self._make_request(messages)
        return self._extract_content(response)
    
    def chat(self, message: str, maintain_context: bool = True) -> str:
        """General chat with the AI assistant"""
        if maintain_context:
            self.conversation_history.append({"role": "user", "content": message})
            messages = [{"role": "system", "content": self.system_prompt}] + self.conversation_history
        else:
            messages = [
                {"role": "system", "content": self.system_prompt},
                {"role": "user", "content": message}
            ]
        
        response = self._make_request(messages)
        content = self._extract_content(response)
        
        if maintain_context and content:
            self.conversation_history.append({"role": "assistant", "content": content})
        
        return content
    
    def clear_history(self):
        """Clear conversation history"""
        self.conversation_history = []
        print("Conversation history cleared.")
    
    def _extract_content(self, response: Dict) -> str:
        """Extract content from API response"""
        if "error" in response:
            return f"Error: {response['error']}"
        
        try:
            return response['choices'][0]['message']['content']
        except (KeyError, IndexError):
            return "Error: Unable to extract response content"
    
    def interactive_mode(self):
        """Run interactive CLI mode"""
        print("\n🤖 AI Code Agent - Interactive Mode")
        print("=" * 50)
        print("Commands:")
        print("  /review <code>    - Review code")
        print("  /generate <desc>  - Generate code from description")
        print("  /debug <code>     - Debug code (provide error after)")
        print("  /explain <code>   - Explain code")
        print("  /optimize <code>  - Optimize code")
        print("  /clear           - Clear conversation history")
        print("  /exit            - Exit interactive mode")
        print("  <message>        - Chat with AI")
        print("=" * 50)
        
        while True:
            try:
                user_input = input("\n> ").strip()
                
                if not user_input:
                    continue
                
                if user_input == "/exit":
                    print("Goodbye! 👋")
                    break
                
                if user_input == "/clear":
                    self.clear_history()
                    continue
                
                # Handle commands
                if user_input.startswith("/"):
                    parts = user_input.split(" ", 1)
                    command = parts[0]
                    content = parts[1] if len(parts) > 1 else ""
                    
                    if command == "/review":
                        print("\n📝 Code Review:")
                        print(self.code_review(content))
                    elif command == "/generate":
                        print("\n🔨 Generated Code:")
                        print(self.generate_code(content))
                    elif command == "/debug":
                        error_msg = input("Error message: ")
                        print("\n🐛 Debug Solution:")
                        print(self.debug_code(content, error_msg))
                    elif command == "/explain":
                        print("\n📚 Code Explanation:")
                        print(self.explain_code(content))
                    elif command == "/optimize":
                        print("\n⚡ Optimized Code:")
                        print(self.optimize_code(content))
                    else:
                        print(f"Unknown command: {command}")
                else:
                    # Regular chat
                    print("\n🤖 AI:", self.chat(user_input))
                    
            except KeyboardInterrupt:
                print("\n\nUse /exit to quit properly")
            except Exception as e:
                print(f"Error: {e}")


# Example usage and main execution
if __name__ == "__main__":
    # Set your API key as environment variable or pass directly
    # os.environ["OPENROUTER_API_KEY"] = "your-api-key-here"
    
    try:
        # Initialize agent
        agent = AICodeAgent(
            api_key="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"
        )
        
        # Example: Generate code
        print("Example - Generating a function:")
        code = agent.generate_code("Create a Python function that validates email addresses using regex")
        print(code)
        
        print("\n" + "="*50 + "\n")
        
        # Example: Review code
        sample_code = """
def calculate_average(numbers):
    total = 0
    for n in numbers:
        total = total + n
    return total / len(numbers)
        """
        
        print("Example - Code Review:")
        review = agent.code_review(sample_code)
        print(review)
        
        print("\n" + "="*50 + "\n")
        
        # Start interactive mode
        agent.interactive_mode()
        
    except ValueError as e:
        print(f"Error: {e}")
        print("Please set your OpenRouter API key")