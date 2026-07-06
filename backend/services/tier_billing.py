"""Activate intelligence tier plans from Stripe checkout or demo mode."""

from __future__ import annotations

from typing import Literal

from db import (
    activate_annual_plan,
    save_user_intelligence_plan,
    set_module_access,
    _sync_intelligence_plan_from_subscriptions,
    touch_user,
)
from services.tier_entitlements import (
    ALL_MARKET_MODULES,
    MARKET_PICK_COUNT,
    markets_allowed,
    tier_allows_all_markets,
)

PricingTierId = Literal["lite", "pro", "ultra", "ultra_plus", "elite"]

TIER_USD: dict[PricingTierId, float] = {
    "lite": 29.99,
    "pro": 59.99,
    "ultra": 99.99,
    "ultra_plus": 149.99,
    "elite": 999.0,
}


def normalize_selected_markets(selected: list[str]) -> list[str]:
    return [m for m in selected if m in ALL_MARKET_MODULES]


def validate_tier_markets(tier: str, selected: list[str]) -> list[str]:
    """Return cleaned market list or raise ValueError."""
    cleaned = normalize_selected_markets(selected)
    if tier in ("ultra", "ultra_plus", "elite"):
        return list(ALL_MARKET_MODULES)
    required = MARKET_PICK_COUNT.get(tier, 1)  # type: ignore[arg-type]
    if len(cleaned) != required:
        raise ValueError(
            f"Tier '{tier}' requires exactly {required} intelligence market(s); got {len(cleaned)}."
        )
    return cleaned


def activate_tier_plan(
    user_id: str,
    tier: str,
    selected_markets: list[str],
    *,
    payment_method: str = "card",
) -> dict:
    """Apply tier entitlements to module subscriptions and intelligence plan row."""
    if tier == "elite":
        activate_annual_plan(user_id, payment_method=payment_method)
        return {
            "tier": "elite",
            "selectedMarkets": list(ALL_MARKET_MODULES),
            "allowedMarkets": list(ALL_MARKET_MODULES),
        }

    markets = validate_tier_markets(tier, selected_markets)
    allowed = markets_allowed(tier, markets)

    set_module_access(user_id, "annual", False, plan_tier=tier, payment_method=payment_method, sync_plan=False)
    for module in ALL_MARKET_MODULES:
        set_module_access(
            user_id,
            module,
            module in allowed,
            plan_tier=tier,
            payment_method=payment_method,
            sync_plan=False,
        )
    save_user_intelligence_plan(user_id, tier, allowed)
    touch_user(user_id)
    return {"tier": tier, "selectedMarkets": allowed, "allowedMarkets": allowed}


def deactivate_tier_subscription(user_id: str, tier: str) -> None:
    """Revoke access when a tier subscription is cancelled."""
    for module in (*ALL_MARKET_MODULES, "annual"):
        set_module_access(user_id, module, False, plan_tier=tier, payment_method="card", sync_plan=False)
    _sync_intelligence_plan_from_subscriptions(user_id)
    touch_user(user_id)


def tier_amount_usd(tier: str) -> float:
    return TIER_USD.get(tier, 0.0)  # type: ignore[arg-type]
