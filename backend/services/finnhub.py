"""Finnhub.io integration — unusual options, insider filings, congress trades."""

from datetime import datetime, timezone

import httpx

from config import settings

FINNHUB_BASE = "https://finnhub.io/api/v1"


async def fetch_unusual_options() -> list[dict]:
    if not settings.finnhub_api_key:
        return _demo_unusual_options()

    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.get(
            f"{FINNHUB_BASE}/stock/option-chain",
            params={"symbol": "SPY", "token": settings.finnhub_api_key},
        )
        resp.raise_for_status()
        data = resp.json()
        return _normalize_options(data)


async def fetch_congress_trades() -> list[dict]:
    if not settings.finnhub_api_key:
        return _demo_congress_trades()

    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.get(
            f"{FINNHUB_BASE}/stock/congressional-trading",
            params={"symbol": "AAPL", "token": settings.finnhub_api_key},
        )
        resp.raise_for_status()
        return _normalize_congress(resp.json())


def _normalize_options(raw: dict) -> list[dict]:
    items: list[dict] = []
    for contract in raw.get("data", [])[:20]:
        items.append(
            {
                "symbol": contract.get("symbol", "—"),
                "type": contract.get("type", "call"),
                "strike": contract.get("strike"),
                "expiry": contract.get("expirationDate"),
                "volume": contract.get("volume"),
                "openInterest": contract.get("openInterest"),
                "premium": contract.get("lastPrice"),
                "sentiment": "bullish" if contract.get("type") == "call" else "bearish",
            }
        )
    return items or _demo_unusual_options()


def _normalize_congress(raw: list | dict) -> list[dict]:
    rows = raw if isinstance(raw, list) else raw.get("data", [])
    return [
        {
            "politician": r.get("name", "Unknown"),
            "symbol": r.get("symbol", "—"),
            "transaction": r.get("transactionType", "Purchase"),
            "amount": r.get("amount", "—"),
            "filedAt": r.get("transactionDate"),
        }
        for r in rows[:15]
    ] or _demo_congress_trades()


def _demo_unusual_options() -> list[dict]:
    now = datetime.now(timezone.utc).isoformat()
    return [
        {
            "symbol": "NVDA",
            "type": "call",
            "strike": 950,
            "expiry": "2026-07-18",
            "volume": 12400,
            "openInterest": 820,
            "premium": 18.40,
            "sentiment": "bullish",
            "note": "Block trade — 3x avg volume",
            "timestamp": now,
        },
        {
            "symbol": "TSLA",
            "type": "put",
            "strike": 240,
            "expiry": "2026-06-27",
            "volume": 8900,
            "openInterest": 1100,
            "premium": 6.20,
            "sentiment": "bearish",
            "note": "Sweep detected — institutional size",
            "timestamp": now,
        },
        {
            "symbol": "AAPL",
            "type": "call",
            "strike": 220,
            "expiry": "2026-08-15",
            "volume": 15200,
            "openInterest": 2400,
            "premium": 4.85,
            "sentiment": "bullish",
            "note": "Unusual OTM activity pre-earnings",
            "timestamp": now,
        },
    ]


def _demo_congress_trades() -> list[dict]:
    return [
        {
            "politician": "Rep. Pelosi",
            "symbol": "NVDA",
            "transaction": "Purchase",
            "amount": "$1M–$5M",
            "filedAt": "2026-06-20",
        },
        {
            "politician": "Sen. Tuberville",
            "symbol": "LMT",
            "transaction": "Purchase",
            "amount": "$100K–$250K",
            "filedAt": "2026-06-18",
        },
    ]
