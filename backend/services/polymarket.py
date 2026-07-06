"""Polymarket Gamma API — free, no auth."""

import httpx

GAMMA = "https://gamma-api.polymarket.com"


async def fetch_top_markets(limit: int = 10) -> list[dict]:
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(
                f"{GAMMA}/events",
                params={"active": "true", "closed": "false", "limit": limit, "order": "volume24hr"},
            )
            resp.raise_for_status()
            events = resp.json()
        items: list[dict] = []
        for ev in events[:limit]:
            markets = ev.get("markets") or []
            if not markets:
                continue
            m = markets[0]
            try:
                prices = __import__("json").loads(m.get("outcomePrices", "[]"))
                yes = float(prices[0]) if prices else 0.5
            except (ValueError, IndexError, TypeError):
                yes = 0.5
            items.append(
                {
                    "market": ev.get("title", m.get("question", "—")),
                    "platform": "Polymarket",
                    "yes": yes,
                    "no": round(1 - yes, 3),
                    "volume24h": f"${float(ev.get('volume24hr') or 0):,.0f}",
                    "slug": ev.get("slug"),
                }
            )
        return items or _demo()
    except Exception:
        return _demo()


def _demo() -> list[dict]:
    return [
        {
            "market": "Fed rate cut in July 2026",
            "platform": "Polymarket",
            "yes": 0.62,
            "no": 0.38,
            "volume24h": "$2.1M",
        },
    ]
