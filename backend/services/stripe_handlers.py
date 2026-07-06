"""Stripe webhook event handlers — checkout, cancellations, invoices."""

from __future__ import annotations

import logging
from typing import Any

from config import settings
from db import (
    activate_annual_plan,
    deactivate_stripe_subscription,
    record_payment_event,
    set_module_access,
    upsert_stripe_subscription,
    upsert_user_profile,
)
from services.billing_attribution import persist_acquisition
from services.tier_billing import activate_tier_plan, tier_amount_usd

logger = logging.getLogger(__name__)

ALL_MODULES = ("trades", "crypto", "betting", "penny", "predictions")
TIER_IDS = frozenset({"lite", "pro", "ultra", "ultra_plus", "elite"})


def handle_stripe_event(event: dict[str, Any]) -> dict[str, Any]:
    etype = event.get("type", "")
    handlers = {
        "checkout.session.completed": _checkout_completed,
        "customer.subscription.deleted": _subscription_deleted,
        "customer.subscription.updated": _subscription_updated,
        "invoice.paid": _invoice_paid,
        "invoice.payment_failed": _invoice_payment_failed,
    }
    handler = handlers.get(etype)
    if handler:
        handler(event["data"]["object"])
    else:
        logger.info("Unhandled Stripe event: %s", etype)
    return {"received": True, "type": etype}


def _parse_selected_markets(meta: dict[str, Any]) -> list[str]:
    raw = meta.get("selected_markets") or ""
    if not raw:
        return []
    return [m.strip() for m in str(raw).split(",") if m.strip()]


def _checkout_completed(session: dict[str, Any]) -> None:
    meta = session.get("metadata") or {}
    user_id = meta.get("user_id")
    module = meta.get("module")
    tier = meta.get("tier")
    if not user_id:
        return

    customer_id = session.get("customer")
    subscription_id = session.get("subscription")
    upsert_user_profile(user_id, stripe_customer_id=customer_id)
    persist_acquisition(user_id, meta.get("acquisition_channel"))

    sub_key = tier or module or "subscription"
    if subscription_id:
        upsert_stripe_subscription(subscription_id, user_id, sub_key, "active", customer_id)

    if tier in TIER_IDS:
        selected = _parse_selected_markets(meta)
        activate_tier_plan(user_id, tier, selected, payment_method="card")
        record_payment_event(
            user_id,
            tier_amount_usd(tier),
            payment_method="card",
            plan_tier=tier,
            module=tier,
            stripe_id=session.get("id"),
        )
        return

    if not module:
        return

    if module == "annual":
        activate_annual_plan(user_id, payment_method="card")
        record_payment_event(
            user_id,
            settings.annual_price_usd,
            payment_method="card",
            plan_tier="annual",
            module="annual",
            stripe_id=session.get("id"),
        )
    elif module == "bundle":
        for m in ALL_MODULES:
            set_module_access(user_id, m, True, plan_tier="bundle", payment_method="card")
        record_payment_event(
            user_id,
            settings.bundle_price_usd,
            payment_method="card",
            plan_tier="bundle",
            module="bundle",
            stripe_id=session.get("id"),
        )
    else:
        set_module_access(user_id, module, True, plan_tier="monthly", payment_method="card")
        record_payment_event(
            user_id,
            29,
            payment_method="card",
            plan_tier="monthly",
            module=module,
            stripe_id=session.get("id"),
        )


def _subscription_deleted(subscription: dict[str, Any]) -> None:
    sub_id = subscription.get("id")
    if sub_id:
        deactivate_stripe_subscription(sub_id)


def _subscription_updated(subscription: dict[str, Any]) -> None:
    status = subscription.get("status", "")
    sub_id = subscription.get("id")
    if not sub_id:
        return
    if status in ("canceled", "unpaid", "incomplete_expired"):
        deactivate_stripe_subscription(sub_id)
    elif status == "active":
        meta = subscription.get("metadata") or {}
        user_id = meta.get("user_id")
        module = meta.get("module")
        tier = meta.get("tier")
        sub_key = tier or module
        if user_id and sub_key:
            upsert_stripe_subscription(
                sub_id,
                user_id,
                sub_key,
                "active",
                subscription.get("customer"),
            )


def _invoice_paid(invoice: dict[str, Any]) -> None:
    meta = invoice.get("metadata") or {}
    user_id = meta.get("user_id")
    if not user_id:
        sub_details = invoice.get("subscription_details") or {}
        sub_meta = sub_details.get("metadata") or {}
        user_id = sub_meta.get("user_id")
    if not user_id:
        return

    amount = (invoice.get("amount_paid") or 0) / 100.0
    module = meta.get("module") or meta.get("tier") or "subscription"
    record_payment_event(
        user_id,
        amount,
        payment_method="card",
        plan_tier=meta.get("plan_tier") or meta.get("tier"),
        module=module,
        status="succeeded",
        stripe_id=invoice.get("id"),
    )


def _invoice_payment_failed(invoice: dict[str, Any]) -> None:
    meta = invoice.get("metadata") or {}
    user_id = meta.get("user_id")
    if not user_id:
        return
    amount = (invoice.get("amount_due") or 0) / 100.0
    record_payment_event(
        user_id,
        amount,
        payment_method="card",
        plan_tier=meta.get("plan_tier") or meta.get("tier"),
        module=meta.get("module") or meta.get("tier") or "subscription",
        status="failed",
        stripe_id=invoice.get("id"),
    )
