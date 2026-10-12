import time
import warnings
from typing import Optional

import openai
import httpx
from rich.console import Console

warnings.filterwarnings("ignore", message="Unverified HTTPS request")

from harness.config import (
    API_PROVIDER,
    OPENAI_API_KEY,
    OPENAI_MODEL,
    OPENAI_BASE_URL,
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
    ):
        self.provider = provider or API_PROVIDER

        if self.provider == "groq":
            self.model = model or GROQ_MODEL
            api_key = GROQ_API_KEY
            base_url = GROQ_BASE_URL
        elif self.provider == "nararouter":
            self.model = model or NARAROUTER_MODEL
            api_key = NARAROUTER_API_KEY
            base_url = NARAROUTER_BASE_URL
        else:
            self.model = model or OPENAI_MODEL
            api_key = OPENAI_API_KEY
            base_url = OPENAI_BASE_URL

        self.temperature = temperature if temperature is not None else OPENAI_TEMPERATURE
        self.max_tokens = max_tokens or OPENAI_MAX_TOKENS
        self.client = openai.OpenAI(
            api_key=api_key,
            base_url=base_url,
            http_client=httpx.Client(verify=False),
        )

    def chat(self, system_prompt: str, user_prompt: str, json_mode: bool = False) -> str:
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ]

        kwargs = {
            "model": self.model,
            "messages": messages,
            "temperature": self.temperature,
            "max_tokens": self.max_tokens,
        }

        if json_mode:
            kwargs["response_format"] = {"type": "json_object"}

        last_error = None
        for attempt in range(1, MAX_RETRIES + 1):
            try:
                response = self.client.chat.completions.create(**kwargs)
                return response.choices[0].message.content.strip()

            except openai.RateLimitError as e:
                last_error = e
                delay = RETRY_BASE_DELAY * (2 ** (attempt - 1))
                console.print(f"[yellow]Rate limited. Retrying in {delay}s (attempt {attempt}/{MAX_RETRIES})...[/yellow]")
                time.sleep(delay)

            except openai.APIError as e:
                last_error = e
                delay = RETRY_BASE_DELAY * (2 ** (attempt - 1))
                console.print(f"[red]API error: {e}. Retrying in {delay}s (attempt {attempt}/{MAX_RETRIES})...[/red]")
                time.sleep(delay)

            except openai.APIConnectionError as e:
                last_error = e
                delay = RETRY_BASE_DELAY * (2 ** (attempt - 1))
                console.print(f"[red]Connection error: {e}. Retrying in {delay}s (attempt {attempt}/{MAX_RETRIES})...[/red]")
                time.sleep(delay)

        raise RuntimeError(f"Failed after {MAX_RETRIES} retries. Last error: {last_error}")
