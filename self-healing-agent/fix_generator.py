import os
import json
from groq import Groq
from tools import logger

class FixGenerator:
    """Uses LLM to perform ask, fix, and explain behaviors via structured outputs."""
    def __init__(self):
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            logger.warning("GROQ_API_KEY is missing. Please add it to your .env file.")
        
        self.client = Groq(api_key=api_key)
        self.primary_model = "llama-3.1-8b-instant"
        self.fallback_model = "llama-3.1-8b-instant"

    def invoke_structured(self, system_prompt: str, user_prompt: str) -> dict:
        """Try primary model first, auto-fallback to smaller model on 413/429 errors."""
        for model in [self.primary_model, self.fallback_model]:
            try:
                logger.info(f"Trying model: {model}")
                completion = self.client.chat.completions.create(
                    model=model,
                    messages=[
                        {"role": "system", "content": system_prompt + "\n\nRespond ONLY in valid JSON format matching the instructions without markup blocks."},
                        {"role": "user", "content": user_prompt}
                    ],
                    temperature=0,
                    response_format={"type": "json_object"}
                )
                content = completion.choices[0].message.content.strip()
                return json.loads(content)
            except Exception as e:
                error_str = str(e)
                if "413" in error_str or "429" in error_str or "rate_limit" in error_str:
                    logger.warning(f"Model {model} hit token limit. Falling back...")
                    if len(user_prompt) > 4000:
                        user_prompt = user_prompt[:4000] + "\n...(truncated)"
                    continue
                else:
                    logger.error(f"LLM Generation failed: {e}")
                    return {"commands": [], "patches": {}, "message": f"Error: {e}"}
        
        logger.error("All models failed. Returning empty response.")
        return {"commands": [], "patches": {}, "message": "Error: All models exceeded token limits. Try a smaller file."}

    def generate_ask_response(self, context: str, query: str) -> dict:
        system = """You are a self-healing AI developer. You are scaffolding a project or answering a question based on context.
        CRITICAL RULE: DO NOT modify the core agent files (agent.py, server.py, main.py, project_scanner.py, patch_applier.py, error_parser.py, fix_generator.py, tools.py, command_runner.py).
        You must return ONLY a valid JSON object with the following structure:
        {
           "message": "A short summary of what you did",
           "patches": { "relative/path/filename.js": "full file content here" },
           "commands": ["npm install", "node index.js"]
        }"""
        safe_context = context[:10000] if len(context) > 10000 else context
        return self.invoke_structured(system, f"Context:\n{safe_context}\n\nQuery: {query}")

    def generate_fix(self, context: str, error_msg: str) -> dict:
        system = """You are a self-healing AI developer catching an error.
        CRITICAL RULE: DO NOT modify the core agent files (agent.py, server.py, main.py, project_scanner.py, patch_applier.py, error_parser.py, fix_generator.py, tools.py, command_runner.py).
        Return ONLY a valid JSON object with the following structure:
        {
           "message": "Explanation of the fix",
           "patches": { "file.js": "Fixed full file content" },
           "commands": ["npm install missing_pkg"]
        }"""
        safe_context = context[:8000] if len(context) > 8000 else context
        safe_error = error_msg[:2000] if len(error_msg) > 2000 else error_msg
        return self.invoke_structured(system, f"Context:\n{safe_context}\n\nError:\n{safe_error}")
        
    def generate_explanation(self, context: str) -> str:
        safe_context = context[:10000] if len(context) > 10000 else context
        prompt = f"Explain this codebase or file in plain English clearly, outlining architecture and data flow. Respond in Markdown.\n\nContext:\n{safe_context}"
        for model in [self.primary_model, self.fallback_model]:
            try:
                completion = self.client.chat.completions.create(
                    model=model,
                    messages=[{"role": "user", "content": prompt}],
                    temperature=0.3
                )
                return completion.choices[0].message.content
            except Exception as e:
                if "413" in str(e) or "429" in str(e):
                    logger.warning(f"Model {model} hit limit for explain. Falling back...")
                    if len(safe_context) > 4000:
                        safe_context = safe_context[:4000]
                        prompt = f"Explain this codebase briefly.\n\nContext:\n{safe_context}"
                    continue
                return f"Error connecting to LLM: {e}"
        return "Error: All models exceeded token limits."
