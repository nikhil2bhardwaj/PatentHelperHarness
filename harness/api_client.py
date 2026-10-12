import os
import json
import time
import warnings
from typing import Optional, Dict, Any

import openai
import httpx
from rich.console import Console

warnings.filterwarnings("ignore", message="Unverified HTTPS request")

from harness.config import (
    API_PROVIDER,
    OPENAI_API_KEY,
    OPENAI_MODEL,
    OPENAI_BASE_URL,
    ANTHROPIC_API_KEY,
    ANTHROPIC_MODEL,
    ANTHROPIC_BASE_URL,
    GEMINI_API_KEY,
    GEMINI_MODEL,
    GEMINI_BASE_URL,
    OPENAI_COMPATIBLE_API_KEY,
    OPENAI_COMPATIBLE_MODEL,
    OPENAI_COMPATIBLE_BASE_URL,
    GROQ_API_KEY,
    GROQ_MODEL,
    GROQ_BASE_URL,
    NARAROUTER_API_KEY,
    NARAROUTER_MODEL,
    NARAROUTER_BASE_URL,
    OPENAI_TEMPERATURE,
    OPENAI_MAX_TOKENS,
    MAX_RETRIES,
    RETRY_BASE_DELAY,
)

console = Console()


class APIClient:
    def __init__(
        self,
        model: Optional[str] = None,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        provider: Optional[str] = None,
        base_url: Optional[str] = None,
        api_key: Optional[str] = None,
    ):
        raw_provider = (provider or API_PROVIDER or "openai").lower()
        if raw_provider in ["openai", "gpt"]:
            self.provider = "openai"
        elif raw_provider in ["anthropic", "claude"]:
            self.provider = "anthropic"
        elif raw_provider in ["gemini", "google"]:
            self.provider = "gemini"
        elif raw_provider in ["openaicompatible", "openai_compatible", "custom", "ollama", "vllm", "local"]:
            self.provider = "openaicompatible"
        elif raw_provider == "groq":
            self.provider = "groq"
        elif raw_provider == "nararouter":
            self.provider = "nararouter"
        else:
            self.provider = "openaicompatible"

        self.temperature = temperature if temperature is not None else OPENAI_TEMPERATURE
        self.max_tokens = max_tokens or OPENAI_MAX_TOKENS

        # 1. Anthropic Provider (Direct REST API)
        if self.provider == "anthropic":
            self.model = model or ANTHROPIC_MODEL
            self.api_key = api_key or ANTHROPIC_API_KEY
            self.base_url = (base_url or ANTHROPIC_BASE_URL).rstrip("/")
            self.http_client = httpx.Client(verify=False, timeout=90.0)

        # 2. OpenAI Provider
        elif self.provider == "openai":
            self.model = model or OPENAI_MODEL
            self.api_key = api_key or OPENAI_API_KEY
            self.base_url = base_url or OPENAI_BASE_URL
            self.client = openai.OpenAI(
                api_key=self.api_key or "sk-dummy",
                base_url=self.base_url,
                http_client=httpx.Client(verify=False, timeout=90.0),
            )

        # 3. Google Gemini Provider (Official OpenAI-compatible endpoint)
        elif self.provider == "gemini":
            self.model = model or GEMINI_MODEL
            self.api_key = api_key or GEMINI_API_KEY
            self.base_url = base_url or GEMINI_BASE_URL
            self.client = openai.OpenAI(
                api_key=self.api_key or "dummy-gemini-key",
                base_url=self.base_url,
                http_client=httpx.Client(verify=False, timeout=90.0),
            )

        # 4. Legacy Groq
        elif self.provider == "groq":
            self.model = model or GROQ_MODEL
            self.api_key = api_key or GROQ_API_KEY
            self.base_url = base_url or GROQ_BASE_URL
            self.client = openai.OpenAI(
                api_key=self.api_key or "dummy-groq-key",
                base_url=self.base_url,
                http_client=httpx.Client(verify=False, timeout=90.0),
            )

        # 5. Legacy NaraRouter
        elif self.provider == "nararouter":
            self.model = model or NARAROUTER_MODEL
            self.api_key = api_key or NARAROUTER_API_KEY
            self.base_url = base_url or NARAROUTER_BASE_URL
            self.client = openai.OpenAI(
                api_key=self.api_key or "dummy-nara-key",
                base_url=self.base_url,
                http_client=httpx.Client(verify=False, timeout=90.0),
            )

        # 6. Generic OpenAI-Compatible (Local Ollama, vLLM, DeepSeek, LMStudio, etc.)
        else:
            self.model = model or OPENAI_COMPATIBLE_MODEL
            self.api_key = api_key or OPENAI_COMPATIBLE_API_KEY or "none"
            self.base_url = base_url or OPENAI_COMPATIBLE_BASE_URL
            self.client = openai.OpenAI(
                api_key=self.api_key,
                base_url=self.base_url,
                http_client=httpx.Client(verify=False, timeout=90.0),
            )

    def _chat_anthropic(self, system_prompt: str, user_prompt: str, json_mode: bool = False) -> str:
        url = f"{self.base_url}/messages"
        headers = {
            "x-api-key": self.api_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        }
        
        system_text = system_prompt
        if json_mode:
            system_text += "\nIMPORTANT: You must respond ONLY with valid JSON. Do not include markdown code block formatting or conversational text."

        payload = {
            "model": self.model,
            "max_tokens": self.max_tokens,
            "temperature": self.temperature,
            "system": system_text,
            "messages": [
                {"role": "user", "content": user_prompt}
            ],
        }

        resp = self.http_client.post(url, headers=headers, json=payload)
        resp.raise_for_status()
        data = resp.json()
        content = data.get("content", [])
        if content and isinstance(content, list):
            text = content[0].get("text", "")
            # Strip markdown fences if present
            if text.startswith("```json"):
                text = text[7:]
            elif text.startswith("```"):
                text = text[3:]
            if text.endswith("```"):
                text = text[:-3]
            return text.strip()
        raise ValueError("Invalid Anthropic response structure")

    def _chat_openai_compatible(self, system_prompt: str, user_prompt: str, json_mode: bool = False) -> str:
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ]

        kwargs: Dict[str, Any] = {
            "model": self.model,
            "messages": messages,
            "temperature": self.temperature,
            "max_tokens": self.max_tokens,
        }

        if json_mode:
            kwargs["response_format"] = {"type": "json_object"}

        response = self.client.chat.completions.create(**kwargs)
        return response.choices[0].message.content.strip()

    def chat(self, system_prompt: str, user_prompt: str, json_mode: bool = False) -> str:
        last_error = None

        for attempt in range(1, MAX_RETRIES + 1):
            try:
                if self.provider == "anthropic":
                    return self._chat_anthropic(system_prompt, user_prompt, json_mode=json_mode)
                else:
                    return self._chat_openai_compatible(system_prompt, user_prompt, json_mode=json_mode)

            except (openai.RateLimitError, httpx.HTTPStatusError) as e:
                status_code = getattr(e, "response", None) and getattr(e.response, "status_code", None)
                if status_code == 429 or isinstance(e, openai.RateLimitError):
                    last_error = e
                    delay = RETRY_BASE_DELAY * (2 ** (attempt - 1))
                    console.print(f"[yellow]Rate limited ({self.provider}). Retrying in {delay}s (attempt {attempt}/{MAX_RETRIES})...[/yellow]")
                    time.sleep(delay)
                    continue
                last_error = e
                delay = RETRY_BASE_DELAY * (2 ** (attempt - 1))
                console.print(f"[red]HTTP error ({self.provider}): {e}. Retrying in {delay}s (attempt {attempt}/{MAX_RETRIES})...[/red]")
                time.sleep(delay)

            except (openai.APIError, openai.APIConnectionError, httpx.RequestError) as e:
                last_error = e
                delay = RETRY_BASE_DELAY * (2 ** (attempt - 1))
                console.print(f"[red]API/Connection error ({self.provider}): {e}. Retrying in {delay}s (attempt {attempt}/{MAX_RETRIES})...[/red]")
                time.sleep(delay)

            except Exception as e:
                last_error = e
                delay = RETRY_BASE_DELAY * (2 ** (attempt - 1))
                console.print(f"[red]Unexpected error ({self.provider}): {e}. Retrying in {delay}s (attempt {attempt}/{MAX_RETRIES})...[/red]")
                time.sleep(delay)

        raise RuntimeError(f"Failed after {MAX_RETRIES} retries on provider '{self.provider}'. Last error: {last_error}")
