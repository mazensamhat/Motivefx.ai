"""AI-powered ops console analysis."""

from __future__ import annotations

import json
import logging
from typing import Any

import httpx

from config import settings

logger = logging.getLogger(__name__)

OPS_SYSTEM = """You are MotiveFX.AI's Chief Growth & Revenue Analyst.
You analyze subscription SaaS metrics for a multi-module trading intelligence platform
(Trades, Crypto, Betting, Pink Slips, Predictions).
Be direct, actionable, and data-driven. Structure your response with:
1) EXECUTIVE SUMMARY (2-3 sentences)
2) TOP OPPORTUNITIES (bullet list)
3) RISKS & CHURN ALERTS (bullet list)
4) CHANNEL & COHORT INSIGHTS (bullet list)
5) RECOMMENDED ACTIONS (numbered, priority order)
Use concrete numbers from the data. Tone: institutional, urgent but professional."""


async def analyze_ops_dashboard(snapshot: dict[str, Any]) -> dict[str, Any]:
    """Return AI narrative + structured highlights for the admin dashboard."""
    payload = _compact_snapshot(snapshot)
    narrative = await _llm_analyze(payload)
    highlights = _rule_highlights(snapshot)
    return {
        "generatedAt": snapshot.get("generatedAt"),
        "model": settings.openai_model if settings.openai_api_key else "local-rules",
        "narrative": narrative,
        "highlights": highlights,
    }


def _compact_snapshot(snapshot: dict[str, Any]) -> dict[str, Any]:
    """Trim snapshot for token efficiency."""
    return {
        "kpis": snapshot.get("kpis"),
        "subscriptionsByModule": snapshot.get("subscriptionsByModule"),
        "moduleActivityRanking": snapshot.get("moduleActivityRanking"),
        "churnByModule": snapshot.get("churnByModule"),
        "demographics": {
            "cohorts": snapshot.get("demographics", {}).get("cohorts"),
            "ageBuckets": snapshot.get("demographics", {}).get("ageBuckets"),
            "topLocations": (snapshot.get("demographics", {}).get("topLocations") or [])[:5],
        },
        "payments": {
            "revenueUsd": snapshot.get("payments", {}).get("revenueUsd"),
            "byPlanTier": snapshot.get("payments", {}).get("byPlanTier"),
        },
        "channelPerformance": snapshot.get("channelPerformance"),
    }


async def _llm_analyze(payload: dict[str, Any]) -> str:
    if not settings.openai_api_key:
        return _local_analysis(payload)

    prompt = (
        "Analyze this MotiveFX.AI ops dashboard snapshot and provide strategic guidance:\n\n"
        f"{json.dumps(payload, indent=2)}"
    )
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {settings.openai_api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": settings.openai_model,
                    "messages": [
                        {"role": "system", "content": OPS_SYSTEM},
                        {"role": "user", "content": prompt},
                    ],
                    "temperature": 0.4,
                    "max_tokens": 1200,
                },
            )
            resp.raise_for_status()
            return resp.json()["choices"][0]["message"]["content"].strip()
    except Exception as exc:
        logger.warning("Ops AI analysis failed: %s", exc)
        return _local_analysis(payload)


def _local_analysis(payload: dict[str, Any]) -> str:
    kpis = payload.get("kpis") or {}
    channels = (payload.get("channelPerformance") or {}).get("channels") or []
    top_mod = (payload.get("moduleActivityRanking") or [{}])[0]
    top_ch = channels[0] if channels else None
    churn = payload.get("churnByModule") or []

    lines = [
        "EXECUTIVE SUMMARY",
        f"MotiveFX has {kpis.get('totalUsers', 0)} users, ~${kpis.get('estimatedMrrUsd', 0):,.0f} estimated MRR, "
        f"and {kpis.get('churnEvents30d', 0)} churn events in the last 30 days.",
        "",
        "TOP OPPORTUNITIES",
        f"• Highest-activity module: {top_mod.get('module', 'n/a')} ({top_mod.get('events', 0)} events)",
    ]
    if top_ch:
        lines.append(
            f"• Top revenue channel: {top_ch.get('platform')} (${top_ch.get('revenueUsd', 0):,.0f})"
        )
    lines.extend(
        [
            "",
            "RISKS & CHURN ALERTS",
        ]
    )
    if churn:
        worst = churn[0]
        lines.append(f"• Highest churn module: {worst.get('module')} ({worst.get('cancellations')} cancellations)")
    else:
        lines.append("• No recent cancellation events recorded.")
    lines.extend(
        [
            "",
            "RECOMMENDED ACTIONS",
            "1. Double ad spend on the top revenue channel.",
            "2. Deploy generational hooks on the highest-churn module.",
            "3. Push annual upsell to monthly-only subscribers.",
        ]
    )
    return "\n".join(lines)


def _rule_highlights(snapshot: dict[str, Any]) -> list[dict[str, str]]:
    highlights: list[dict[str, str]] = []
    kpis = snapshot.get("kpis") or {}
    if kpis.get("churnEvents30d", 0) > 5:
        highlights.append({"type": "warning", "text": f"Elevated churn: {kpis['churnEvents30d']} events in 30d"})
    ranking = snapshot.get("moduleActivityRanking") or []
    if ranking:
        highlights.append(
            {"type": "info", "text": f"Most active module: {ranking[0]['module']} ({ranking[0]['events']} events)"}
        )
    ch = snapshot.get("channelPerformance") or {}
    if ch.get("topRevenueChannel"):
        highlights.append(
            {"type": "success", "text": f"Top business channel: {ch['topRevenueChannel']}"}
        )
    return highlights
