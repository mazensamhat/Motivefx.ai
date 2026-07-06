from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from config import settings
from services.stripe_handlers import handle_stripe_event
from services.short_links import list_short_links
from services import coinstats, odds_api, penny_scanner, yfinance_scanner

router = APIRouter(prefix="/api", tags=["core"])


class CheckoutRequest(BaseModel):
    tier: str  # "basic" | "alpha"
    success_url: str
    cancel_url: str


@router.get("/health")
async def health():
    return {
        "status": "ok",
        "app": "MotiveFX.AI",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "feeds": {
            "finnhub": bool(settings.finnhub_api_key),
            "coinstats": bool(settings.coinstats_api_key),
            "the_odds_api": bool(settings.the_odds_api_key),
            "stripe": bool(settings.stripe_secret_key),
            "openai": bool(settings.openai_api_key),
        },
    }


@router.get("/live-feed")
async def live_feed():
    """Aggregated ticker for the dashboard marquee."""
    whales = await coinstats.fetch_whale_alerts()
    options = yfinance_scanner.scan_unusual_options()[:3]
    lines = await odds_api.fetch_line_moves()

    events: list[dict] = []

    for w in whales[:2]:
        amt = w.get("amountUsd", 0)
        events.append(
            {
                "type": "crypto",
                "severity": "high",
                "message": f"${w['asset']} whale moved ${amt / 1_000_000:.0f}M — {w.get('note', w.get('direction', ''))}",
                "timestamp": w.get("timestamp"),
            }
        )

    for o in options[:2]:
        events.append(
            {
                "type": "stock",
                "severity": "medium",
                "message": f"Unusual ${o['symbol']} {o['type'].upper()} activity — {o.get('note', 'block trade detected')}",
                "timestamp": o.get("timestamp"),
            }
        )

    for line in lines[:2]:
        events.append(
            {
                "type": "betting",
                "severity": "medium",
                "message": f"Line move: {line['matchup']} opened {line.get('openingLine')} → now {line.get('currentLine')}",
                "timestamp": line.get("timestamp"),
            }
        )

    penny_moves = penny_scanner.scan_penny_movers()[:2]
    for p in penny_moves:
        events.append(
            {
                "type": "penny",
                "severity": "high",
                "message": f"${p['symbol']} pink slip {p.get('changePct', 0):+.1f}% — {p.get('note', 'volume spike')}",
                "timestamp": p.get("timestamp"),
            }
        )

    return {"events": events}


@router.get("/track/visit")
async def track_channel_visit(
    channel: str,
    user_id: str | None = None,
    redirect: str | None = None,
):
    """Record inbound traffic from a social channel. Use in bio links: /api/track/visit?channel=instagram"""
    allowed = {"instagram", "tiktok", "facebook", "youtube", "x", "twitter", "website", "referral", "other"}
    cid = channel.lower().replace("@", "")
    if cid == "twitter":
        cid = "x"
    if cid not in allowed:
        raise HTTPException(400, f"Unknown channel: {channel}")
    record_channel_visit(cid, user_id)
    if redirect:
        from fastapi.responses import RedirectResponse
        return RedirectResponse(url=redirect)
    return {"ok": True, "channel": cid, "recorded": True}


@router.get("/go/links")
async def short_links_catalog():
    """Public list of bio short links — e.g. /go/ig for Instagram."""
    return {"links": list_short_links()}


@router.post("/billing/checkout")
async def create_checkout(body: CheckoutRequest):
    if not settings.stripe_secret_key:
        raise HTTPException(
            status_code=503,
            detail="Stripe not configured. Add STRIPE_SECRET_KEY to .env",
        )

    import stripe

    stripe.api_key = settings.stripe_secret_key

    price_id = (
        settings.stripe_price_alpha
        if body.tier == "alpha"
        else settings.stripe_price_basic
    )
    if not price_id:
        raise HTTPException(status_code=400, detail=f"No Stripe price configured for tier: {body.tier}")

    session = stripe.checkout.Session.create(
        mode="subscription",
        line_items=[{"price": price_id, "quantity": 1}],
        success_url=body.success_url,
        cancel_url=body.cancel_url,
        subscription_data={"trial_period_days": 3},
    )
    return {"checkoutUrl": session.url, "sessionId": session.id}


@router.post("/billing/webhook")
async def stripe_webhook(request: Request):
    if not settings.stripe_webhook_secret:
        raise HTTPException(status_code=503, detail="Webhook secret not configured")

    import stripe

    stripe.api_key = settings.stripe_secret_key
    payload = await request.body()
    sig = request.headers.get("stripe-signature", "")

    try:
        event = stripe.Webhook.construct_event(payload, sig, settings.stripe_webhook_secret)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature")

    return handle_stripe_event(event)
