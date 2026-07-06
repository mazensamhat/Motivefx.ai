"""Require plan-tier capabilities beyond module/market access."""

from fastapi import HTTPException

from db import get_user_plan
from services.tier_entitlements import tier_has_feature


def require_feature(user_id: str, feature: str) -> None:
    plan = get_user_plan(user_id)
    if not tier_has_feature(plan["tier"], feature):
        raise HTTPException(
            status_code=403,
            detail={
                "code": "tier_locked",
                "feature": feature,
                "tier": plan["tier"],
                "requiredTier": _min_tier_label(feature),
                "message": _feature_message(feature),
            },
        )


def _min_tier_label(feature: str) -> str:
    from services.tier_entitlements import FEATURE_MIN_TIER

    t = FEATURE_MIN_TIER.get(feature, "pro")
    return {"lite": "Lite", "pro": "Pro", "ultra": "Ultra", "ultra_plus": "Ultra+", "elite": "Elite"}.get(t, "Pro")


def _feature_message(feature: str) -> str:
    labels = {
        "portfolio_intelligence": "Portfolio Intelligence",
        "ai_memory": "AI Memory",
        "since_you_were_away": "Since You Were Away",
        "voice_briefing": "Voice Briefing",
        "decision_history": "Decision History",
        "api_access": "API Access",
    }
    name = labels.get(feature, feature.replace("_", " ").title())
    return f"Upgrade your plan to unlock {name}."
