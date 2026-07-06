"""Canonical billing URLs derived from APP_PUBLIC_URL (single-origin deployment)."""

from __future__ import annotations

from urllib.parse import urlparse

from config import settings

WEBHOOK_PATH = "/api/billing/webhook"


def _origin(url: str) -> str:
    return url.rstrip("/")


def app_origin() -> str:
    """Public app origin — e.g. https://motivefxai.com"""
    if settings.app_public_url:
        return _origin(settings.app_public_url)
    return "http://127.0.0.1:5280"


def is_local_origin() -> bool:
    host = urlparse(app_origin()).hostname or ""
    return host in ("localhost", "127.0.0.1") or host.endswith(".local")


def stripe_webhook_url() -> str:
    """Stripe Dashboard webhook endpoint (HTTPS required in production)."""
    return f"{app_origin()}{WEBHOOK_PATH}"


def tier_checkout_success_url(tier: str) -> str:
    return f"{app_origin()}/?tier={tier}"


def tier_checkout_cancel_url() -> str:
    return f"{app_origin()}/#pricing"


def module_checkout_success_url(module: str) -> str:
    return f"{app_origin()}/?sub={module}"


def annual_checkout_success_url() -> str:
    return f"{app_origin()}/?annual=1"


def billing_portal_return_url() -> str:
    return f"{app_origin()}/?billing=1"


def resolve_checkout_urls(
    *,
    tier: str | None = None,
    module: str | None = None,
    annual: bool = False,
    success_url: str | None = None,
    cancel_url: str | None = None,
) -> tuple[str, str]:
    """Use APP_PUBLIC_URL in production; allow client URLs on local dev only."""
    if annual:
        canonical_success = annual_checkout_success_url()
    elif tier:
        canonical_success = tier_checkout_success_url(tier)
    elif module:
        canonical_success = module_checkout_success_url(module)
    else:
        canonical_success = app_origin()
    canonical_cancel = tier_checkout_cancel_url()

    if is_local_origin():
        return success_url or canonical_success, cancel_url or canonical_cancel
    return canonical_success, canonical_cancel


def public_billing_config() -> dict:
    return {
        "appOrigin": app_origin(),
        "webhookUrl": stripe_webhook_url(),
        "isLocalDev": is_local_origin(),
        "checkoutSuccessPattern": f"{app_origin()}/?tier={{tier}}",
        "checkoutCancelUrl": tier_checkout_cancel_url(),
        "portalReturnUrl": billing_portal_return_url(),
    }
