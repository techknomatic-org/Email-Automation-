import re
import json
import time
import requests
from typing import Optional, Dict, Any, List
from backend.app.core.config import settings

class OpenRouterService:
    """
    Resilient Multi-Model & Multi-Key OpenRouter Service with Automatic Key Rotation & Failover.
    Attempts: (Key 1, Model 1) ➔ (Key 2, Model 2) ➔ (Key 3, Model 3).
    Logs structured events (OPENROUTER_MODEL_1_SUCCESS, RATE_LIMIT, FALLBACK) without exposing keys.
    """

    @classmethod
    def complete(
        cls,
        prompt: str,
        system_instruction: str = "You are a helpful AI assistant.",
        temperature: float = 0.1,
        timeout: float = 12.0,
        response_format_json: bool = False

    ) -> Optional[str]:
        chain = settings.get_openrouter_chain()
        if not chain:
            print("[OPENROUTER_SERVICE] Warning: No valid OpenRouter API keys configured.")
            return None

        fallback_count = 0
        start_time = time.time()

        for idx, (api_key, model_id) in enumerate(chain, start=1):
            if not api_key or len(api_key) < 10 or api_key.startswith("demo-") or "example" in api_key:
                continue

            try:
                url = "https://openrouter.ai/api/v1/chat/completions"
                clean_model = model_id.replace("openai:", "").replace("openrouter:", "")
                if not clean_model:
                    clean_model = "meta-llama/llama-3.1-8b-instruct:free"

                headers = {
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                    "HTTP-Referer": "http://localhost:5173",
                    "X-Title": "OpenOutreach AI"
                }

                messages = []
                if system_instruction:
                    messages.append({"role": "system", "content": system_instruction})
                messages.append({"role": "user", "content": prompt})

                payload = {
                    "model": clean_model,
                    "messages": messages,
                    "temperature": temperature
                }

                if response_format_json and "gpt" in clean_model.lower():
                    payload["response_format"] = {"type": "json_object"}

                req_start = time.time()
                resp = requests.post(url, json=payload, headers=headers, timeout=timeout)
                duration_ms = int((time.time() - req_start) * 1000)

                if resp.status_code == 200:
                    data = resp.json()
                    content = data["choices"][0]["message"]["content"].strip()
                    print(
                        f"[OPENROUTER_MODEL_{idx}_SUCCESS] model='{clean_model}', "
                        f"duration_ms={duration_ms}, fallback_count={fallback_count}",
                        flush=True
                    )
                    return content
                elif resp.status_code in [401, 402]:
                    print(
                        f"[OPENROUTER_AUTH_OR_CREDIT_ERROR] status={resp.status_code}, model='{clean_model}'. "
                        f"Fast-failing to deterministic pipeline.",
                        flush=True
                    )
                    break
                elif resp.status_code == 429:
                    print(
                        f"[OPENROUTER_MODEL_{idx}_RATE_LIMIT] status=429, model='{clean_model}', "
                        f"duration_ms={duration_ms}. Triggering fallback...",
                        flush=True
                    )
                    fallback_count += 1
                else:
                    print(
                        f"[OPENROUTER_MODEL_{idx}_ERROR] status={resp.status_code}, model='{clean_model}', "
                        f"duration_ms={duration_ms}. Triggering fallback...",
                        flush=True
                    )
                    fallback_count += 1
            except requests.exceptions.Timeout:
                print(
                    f"[OPENROUTER_MODEL_{idx}_TIMEOUT] timeout={timeout}s, model='{model_id}'. "
                    f"Fast-failing to deterministic pipeline.",
                    flush=True
                )
                break
            except Exception as err:
                print(
                    f"[OPENROUTER_MODEL_{idx}_FAIL] error='{err}', model='{model_id}'. "
                    f"Triggering fallback...",
                    flush=True
                )
                fallback_count += 1

        print(
            f"[OPENROUTER_ALL_MODELS_FAILED] total_duration_ms={int((time.time() - start_time) * 1000)}, "
            f"fallback_count={fallback_count}. Falling back to deterministic pipeline.",
            flush=True
        )
        return None

openrouter_service = OpenRouterService()
