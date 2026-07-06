"""OpenAI LLM layer — enriches signal-engine output with natural-language advice."""

import json
import logging
from typing import Any

import httpx

from config import settings
from models.schemas import Recommendation

logger = logging.getLogger(__name__)

SYSTEM = """You are MotiveFX.AI — the Bloomberg Terminal for retail traders, bettors, and crypto natives.
You speak like institutional research: confident, data-dense, FOMO-inducing but legally careful.
Use phrases like: "unusual flow", "smart money", "institutional accumulation", "sharp side", "whale alert".
Weave in breaking news when provided — explain how headlines affect the user's specific picks or holdings.
Always end with a clear CONCLUSION line: Bullish Continuation Likely / Distribution Risk / Wait for Confirmation.
DISCLAIMER: Informational only. Not financial advice."""


async def enrich_analysis(
    module: str,
    summary: str,
    recommendations: list[Recommendation],
    picks: list[Recommendation] | None = None,
    news: list[dict[str, Any]] | None = None,
) -> str:
    """Return LLM narrative, or a polished local fallback if no API key."""
    if not settings.openai_api_key:
        return _local_narrative(module, summary, recommendations, picks, news)

    payload = {
        "module": module,
        "engine_summary": summary,
        "recommendations": [r.model_dump() for r in recommendations],
        "picks": [p.model_dump() for p in (picks or [])],
        "breaking_news": news or [],
    }
    user_prompt = (
        f"Module: {module}\n"
        f"Engine output:\n{json.dumps(payload, indent=2)}\n\n"
        "Write an 'AI DEEP SCAN' briefing:\n"
        "1) One punchy headline with ticker/position\n"
        "2) 2-3 sentences connecting SMART-MONEY signals AND any breaking news to the user's picks/holdings\n"
        "3) Final line: CONCLUSION: [Bullish Continuation Likely | Distribution Risk | Wait for Confirmation]\n"
        "Tone: urgent, elite, like Unusual Whales meets Goldman research desk."
    )

    try:
        async with httpx.AsyncClient(timeout=45.0) as client:
            resp = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {settings.openai_api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": settings.openai_model,
                    "messages": [
                        {"role": "system", "content": SYSTEM},
                        {"role": "user", "content": user_prompt},
                    ],
                    "temperature": 0.6,
                    "max_tokens": 700,
                },
            )
            resp.raise_for_status()
            return resp.json()["choices"][0]["message"]["content"].strip()
    except Exception as exc:
        logger.warning("LLM enrichment failed: %s", exc)
        return _local_narrative(module, summary, recommendations, picks, news)


def _local_narrative(
    module: str,
    summary: str,
    recommendations: list[Recommendation],
    picks: list[Recommendation] | None,
    news: list[dict[str, Any]] | None = None,
) -> str:
    """Rule-based narrative when OpenAI is unavailable."""
    top = sorted(recommendations, key=lambda r: r.confidence, reverse=True)[:1]
    lines: list[str] = []

    if top:
        r = top[0]
        label = r.symbol or r.matchup or "—"
        verdict = "Bullish market trend" if r.action in ("buy", "lean") else (
            "Bearish market trend" if r.action in ("sell", "fade") else "Neutral — mixed signals"
        )
        lines = [
            f"${label} Analysis" if r.symbol else f"{label} Analysis",
            "",
            r.reasoning,
        ]
    else:
        lines = [summary, ""]

    personal_news = [n for n in (news or []) if n.get("affectsYou")][:2]
    if personal_news:
        lines.append("")
        lines.append("News affecting your picks:")
        for n in personal_news:
            lines.append(f"• [{n.get('category', 'news').upper()}] {n.get('headline', '')}")

    if top:
        verdict = "Bullish Continuation Likely" if top[0].action in ("buy", "lean") else (
            "Distribution Risk" if top[0].action in ("sell", "fade") else "Wait for Confirmation"
        )
        lines.append("")
        lines.append(f"CONCLUSION: {verdict}")
        return "\n".join(lines)

    top_recs = sorted(recommendations, key=lambda r: r.confidence, reverse=True)[:3]
    if top_recs:
        lines.append("Top signal context:")
        for r in top_recs:
            label = r.symbol or r.matchup or "—"
            lines.append(f"• {label} ({r.confidence}/100 signal strength) — {r.headline}")

    if picks:
        lines.append("")
        lines.append("Market intelligence highlights:")
        for p in picks[:3]:
            lines.append(f"• {p.headline}")

    return "\n".join(lines)
