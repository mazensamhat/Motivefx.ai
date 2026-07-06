"""Plan-tier feature and intelligence-market access control."""

from __future__ import annotations

from typing import Literal

PricingTierId = Literal["lite", "pro", "ultra", "ultra_plus", "elite"]

TIER_ORDER: list[PricingTierId] = ["lite", "pro", "ultra", "ultra_plus", "elite"]

ALL_MARKET_MODULES = ("trades", "crypto", "betting", "penny", "predictions")

# Minimum tier required for each capability (Lite cannot access Pro+ features).
FEATURE_MIN_TIER: dict[str, PricingTierId] = {
    "ai_brief": "lite",
    "ask_motive": "lite",
    "research_briefs_limited": "lite",
    "following": "lite",
    "market_intelligence": "lite",
    "research_briefs_unlimited": "pro",
    "portfolio_intelligence": "pro",
    "ai_memory": "pro",
    "since_you_were_away": "pro",
    "push_notifications": "pro",
    "motive_daily_email": "pro",
    "voice_briefing": "ultra",
    "motive_daily_voice": "ultra",
    "decision_history": "ultra",
    "advanced_analytics": "ultra",
    "api_access": "ultra_plus",
    "multiple_portfolios": "ultra_plus",
    "team_workspace": "ultra_plus",
    "beta_features": "ultra_plus",
    "concierge_support": "ultra_plus",
    "white_glove_onboarding": "elite",
    "direct_product_feedback": "elite",
    "early_ai_models": "elite",
}

MARKET_PICK_COUNT: dict[PricingTierId, int] = {
    "lite": 1,
    "pro": 2,
    "ultra": 5,
    "ultra_plus": 5,
    "elite": 5,
}

ALL_MARKETS_TIERS: frozenset[PricingTierId] = frozenset({"ultra", "ultra_plus", "elite"})


def tier_rank(tier: str) -> int:
    try:
        return TIER_ORDER.index(tier)  # type: ignore[arg-type]
    except ValueError:
        return 0


def tier_has_feature(tier: str, feature: str) -> bool:
    min_tier = FEATURE_MIN_TIER.get(feature)
    if min_tier is None:
        return False
    return tier_rank(tier) >= tier_rank(min_tier)


def tier_allows_all_markets(tier: str) -> bool:
    return tier in ALL_MARKETS_TIERS


def max_market_picks(tier: str) -> int:
    return MARKET_PICK_COUNT.get(tier, 1)  # type: ignore[arg-type]


def markets_allowed(tier: str, selected_markets: list[str]) -> list[str]:
    """Effective market modules for this plan."""
    if tier_allows_all_markets(tier):
        return list(ALL_MARKET_MODULES)
    cap = max_market_picks(tier)
    return selected_markets[:cap]


def market_is_allowed(tier: str, selected_markets: list[str], module: str) -> bool:
    if module not in ALL_MARKET_MODULES:
        return False
    if tier_allows_all_markets(tier):
        return True
    return module in markets_allowed(tier, selected_markets)


def infer_tier_from_modules(paid_modules: list[str], has_annual: bool) -> PricingTierId:
    """Map legacy module subscriptions to intelligence tier."""
    if has_annual:
        return "elite"
    paid = [m for m in paid_modules if m in ALL_MARKET_MODULES]
    n = len(paid)
    if n >= 5:
        return "ultra"
    if n >= 2:
        return "pro"
    if n >= 1:
        return "lite"
    return "lite"


def features_for_tier(tier: str) -> list[str]:
    return [f for f in FEATURE_MIN_TIER if tier_has_feature(tier, f)]


def filter_briefing_for_plan(briefing: dict, plan: dict) -> dict:
    """Strip opportunities and capabilities the user's tier cannot access."""
    allowed = set(plan["allowedMarkets"])
    features = plan["features"]

    opportunities = [o for o in briefing.get("opportunities", []) if o.get("module") in allowed]
    briefing["opportunities"] = opportunities
    briefing["opportunityCount"] = len(opportunities)

    if opportunities:
        briefing["biggestOpportunity"] = opportunities[0].get("symbol", briefing.get("biggestOpportunity"))
    else:
        briefing["biggestOpportunity"] = "Scanning…"

    briefing["highRiskAlerts"] = sum(
        1 for o in opportunities if o.get("riskLevel") in ("high", "extreme")
    )

    briefing["moduleSummaries"] = [
        s for s in briefing.get("moduleSummaries", []) if s.get("module") in allowed
    ]

    briefing["compareLens"] = [
        c for c in briefing.get("compareLens", []) if c.get("module") in allowed
    ]

    stories = briefing.get("moduleStories") or {}
    briefing["moduleStories"] = {k: v for k, v in stories.items() if k in allowed}

    personalized = dict(briefing.get("personalized") or {})
    if not features.get("portfolio_intelligence"):
        if personalized.get("coverageLine") and "holding" in (personalized["coverageLine"] or "").lower():
            personalized["coverageLine"] = None
        if personalized.get("intelNote") and "holdings" in (personalized["intelNote"] or "").lower():
            personalized["intelNote"] = "Star symbols on your radar to get signal coverage on Home."
        personalized["holdingsCount"] = 0

    if not features.get("since_you_were_away"):
        personalized["radarHits"] = []

    briefing["personalized"] = personalized

    if not features.get("voice_briefing"):
        briefing["audioBriefingScript"] = None

    briefing["entitlements"] = {
        "tier": plan["tier"],
        "allowedMarkets": plan["allowedMarkets"],
        "features": features,
    }
    return briefing
