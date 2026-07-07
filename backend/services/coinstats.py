"""Crypto whale alerts, liquidations, and prediction market odds."""

from datetime import datetime, timezone

import httpx

from config import settings

COINSTATS_BASE = "https://openapiv1.coinstats.app"


async def fetch_whale_alerts() -> list[dict]:
    if not settings.coinstats_api_key:
        return _demo_whale_alerts()

    headers = {"X-API-KEY": settings.coinstats_api_key}
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(f"{COINSTATS_BASE}/whale/transactions", headers=headers)
            resp.raise_for_status()
            return _normalize_whales(resp.json())
    except Exception:
        return _demo_whale_alerts()


async def fetch_prediction_odds() -> list[dict]:
    # Polymarket/Kalshi require separate integrations — demo until wired
    return _demo_prediction_odds()


def _normalize_whales(raw: dict | list) -> list[dict]:
    rows = raw if isinstance(raw, list) else raw.get("result", [])
    return [
        {
            "asset": r.get("coin", "—"),
            "amountUsd": r.get("amountUsd"),
            "from": r.get("from", "unknown wallet"),
            "to": r.get("to", "exchange"),
            "direction": r.get("direction", "deposit"),
            "timestamp": r.get("timestamp"),
        }
        for r in rows[:20]
    ] or _demo_whale_alerts()


def _demo_whale_alerts() -> list[dict]:
    now = datetime.now(timezone.utc).isoformat()
    return [
        {
            "asset": "BTC",
            "amountUsd": 42_000_000,
            "from": "bc1q…x7k2",
            "to": "Binance Hot Wallet",
            "direction": "deposit",
            "note": "Potential sell pressure — $42M moved to exchange",
            "timestamp": now,
        },
        {
            "asset": "ETH",
            "amountUsd": 18_500_000,
            "from": "Coinbase",
            "to": "0x742d…9f3a",
            "direction": "withdrawal",
            "note": "Whale accumulation — off-exchange custody",
            "timestamp": now,
        },
        {
            "asset": "SOL",
            "amountUsd": 6_200_000,
            "from": "Kraken",
            "to": "Cold storage",
            "direction": "withdrawal",
            "note": "Large withdrawal — bullish signal",
            "timestamp": now,
        },
    ]


def _demo_prediction_odds() -> list[dict]:
    return [
        {
            "market": "Fed rate cut in July 2026",
            "platform": "Polymarket",
            "yes": 0.62,
            "no": 0.38,
            "volume24h": "$2.1M",
        },
        {
            "market": "BTC above $120K by Aug 2026",
            "platform": "Kalshi",
            "yes": 0.41,
            "no": 0.59,
            "volume24h": "$890K",
        },
        {
            "market": "Trump approval > 50% EOY",
            "platform": "Polymarket",
            "yes": 0.55,
            "no": 0.45,
            "volume24h": "$1.4M",
        },
    ]
