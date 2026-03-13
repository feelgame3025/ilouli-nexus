"""AI client using GitHub Copilot API (2-step token exchange).

Same approach as ilouli-news gptMiniClient.js:
1. ghu_* token → exchange for session token via Copilot internal API
2. Use session token for chat completions

$0 cost — uses GitHub Copilot Pro unlimited models.
"""
import json
import time
import logging

import aiohttp

from app.core.config import GITHUB_TOKEN

logger = logging.getLogger(__name__)

# ─── Config ─────────────────────────────────────────
TOKEN_EXCHANGE_URL = "https://api.github.com/copilot_internal/v2/token"
DEFAULT_MODEL = "gpt-4o-mini"
USER_AGENT = "ilouli-nexus/1.0"

# ─── Token cache (in-memory) ────────────────────────
_cached_token: str | None = None
_token_expires_at: float = 0
_api_endpoint: str = "https://api.individual.githubcopilot.com"


async def _exchange_token() -> str:
    """Exchange ghu_* token for a session token."""
    global _cached_token, _token_expires_at, _api_endpoint

    if not GITHUB_TOKEN:
        raise RuntimeError("GITHUB_TOKEN (ghu_*) is not set")

    logger.info("Exchanging Copilot token...")

    async with aiohttp.ClientSession() as session:
        async with session.get(
            TOKEN_EXCHANGE_URL,
            headers={
                "Authorization": f"token {GITHUB_TOKEN}",
                "Accept": "application/json",
                "User-Agent": USER_AGENT,
            },
            timeout=aiohttp.ClientTimeout(total=10),
        ) as resp:
            if resp.status != 200:
                body = await resp.text()
                logger.error("Token exchange failed: %d %s", resp.status, body[:200])
                raise RuntimeError(f"Token exchange failed: {resp.status}")

            data = await resp.json()
            _cached_token = data["token"]
            _token_expires_at = (data.get("expires_at", 0)) * 1.0  # Unix timestamp
            if data.get("endpoints", {}).get("api"):
                _api_endpoint = data["endpoints"]["api"]

            logger.info("Token exchanged, expires at %s", time.ctime(_token_expires_at))
            return _cached_token


async def _get_token() -> str:
    """Get a valid session token, refreshing if needed (5 min buffer)."""
    now = time.time()
    if _cached_token and _token_expires_at > now + 300:
        return _cached_token
    return await _exchange_token()


async def chat_completion(
    messages: list[dict],
    temperature: float = 0.3,
    max_tokens: int = 4096,
    model: str | None = None,
) -> str:
    """Send a chat completion request via GitHub Copilot API.

    Args:
        messages: List of message dicts with 'role' and 'content'.
        temperature: Sampling temperature (0.0-1.0).
        max_tokens: Maximum tokens in response.
        model: Model name (default: gpt-4o-mini).

    Returns:
        The assistant's response text.
    """
    global _cached_token

    token = await _get_token()
    use_model = model or DEFAULT_MODEL

    payload = {
        "model": use_model,
        "messages": messages,
        "max_tokens": max_tokens,
        "temperature": temperature,
    }

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "Copilot-Integration-Id": "vscode-chat",
        "Editor-Version": "vscode/1.96.0",
    }

    async with aiohttp.ClientSession() as session:
        async with session.post(
            f"{_api_endpoint}/chat/completions",
            headers=headers,
            json=payload,
            timeout=aiohttp.ClientTimeout(total=60),
        ) as resp:
            if resp.status == 401:
                # Token expired, retry with fresh token
                logger.info("Token expired, re-exchanging...")
                _cached_token = None
                new_token = await _exchange_token()
                headers["Authorization"] = f"Bearer {new_token}"

                async with session.post(
                    f"{_api_endpoint}/chat/completions",
                    headers=headers,
                    json=payload,
                    timeout=aiohttp.ClientTimeout(total=60),
                ) as retry_resp:
                    if retry_resp.status != 200:
                        body = await retry_resp.text()
                        raise RuntimeError(f"AI API retry failed: {retry_resp.status}: {body[:200]}")
                    data = await retry_resp.json()
                    return data["choices"][0]["message"]["content"]

            if resp.status != 200:
                body = await resp.text()
                logger.error("AI API error %d: %s", resp.status, body[:500])
                raise RuntimeError(f"AI API returned {resp.status}: {body[:200]}")

            data = await resp.json()
            return data["choices"][0]["message"]["content"]


async def chat_completion_json(
    messages: list[dict],
    temperature: float = 0.3,
    max_tokens: int = 4096,
) -> dict:
    """Chat completion that parses JSON from the response.

    Strips markdown code fences if present, then parses JSON.
    """
    raw = await chat_completion(messages, temperature, max_tokens)

    # Strip markdown code fences
    text = raw.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        if lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        text = "\n".join(lines)

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        # Try extracting JSON object from text
        import re
        match = re.search(r'\{[\s\S]*\}', text)
        if match:
            try:
                return json.loads(match.group())
            except json.JSONDecodeError:
                pass
        logger.error("Failed to parse AI JSON: %s", raw[:500])
        raise RuntimeError(f"AI returned invalid JSON: {text[:200]}")
