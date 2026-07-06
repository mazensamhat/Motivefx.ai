"""Shared Stripe checkout metadata helpers."""

from __future__ import annotations

from db import get_conn, upsert_user_profile


def _normalize_channel(acquisition_channel: str) -> str:
    channel = acquisition_channel.lower().strip()
    return "x" if channel == "twitter" else channel


def get_user_acquisition_channel(user_id: str) -> str | None:
    with get_conn() as conn:
        row = conn.execute(
            "SELECT acquisition_channel FROM users WHERE user_id = ?",
            (user_id,),
        ).fetchone()
        return row["acquisition_channel"] if row else None


def persist_acquisition(user_id: str, acquisition_channel: str | None) -> str | None:
    """First-touch: save channel on profile if not already set."""
    if not acquisition_channel:
        return get_user_acquisition_channel(user_id)
    channel = _normalize_channel(acquisition_channel)
    existing = get_user_acquisition_channel(user_id)
    if existing:
        return existing
    upsert_user_profile(user_id, acquisition_channel=channel)
    return channel


def stripe_checkout_metadata(
    user_id: str,
    module: str,
    *,
    acquisition_channel: str | None = None,
    plan_tier: str | None = None,
    tier: str | None = None,
    selected_markets: list[str] | None = None,
) -> dict[str, str]:
    """Metadata attached to Stripe Checkout session + subscription for webhook attribution."""
    meta: dict[str, str] = {"user_id": user_id, "module": module}
    if acquisition_channel:
        meta["acquisition_channel"] = _normalize_channel(acquisition_channel)
    if plan_tier:
        meta["plan_tier"] = plan_tier
    if tier:
        meta["tier"] = tier
    if selected_markets:
        meta["selected_markets"] = ",".join(selected_markets)
    return meta
