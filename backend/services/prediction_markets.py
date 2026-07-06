"""Prediction markets — Polymarket-style events (war, politics, celebrity, etc.)."""

from datetime import datetime, timedelta, timezone

CATEGORIES = {
    "geopolitics": {"label": "Geopolitics & War", "tags": ["war", "conflict", "ceasefire", "invasion"]},
    "politics": {"label": "Politics & Elections", "tags": ["election", "president", "congress", "vote"]},
    "entertainment": {"label": "Celebrity & Culture", "tags": ["marriage", "wedding", "celebrity", "award"]},
    "economy": {"label": "Economy & Fed", "tags": ["fed", "rate", "recession", "inflation"]},
    "science": {"label": "Science & Tech", "tags": ["ai", "spacex", "fda", "climate"]},
    "crypto": {"label": "Crypto Events", "tags": ["bitcoin", "eth", "sec", "etf"]},
}


async def fetch_markets(category: str | None = None, limit: int = 20) -> list[dict]:
    from services import polymarket

    live = await polymarket.fetch_top_markets(limit)
    items = _enrich_categories(live)
    items.extend(_demo_markets())
    if category:
        items = [m for m in items if m.get("category") == category]
    seen: set[str] = set()
    unique = []
    for m in items:
        key = m.get("market", "")
        if key in seen:
            continue
        seen.add(key)
        unique.append(m)
    return unique[:limit]


async def fetch_prediction_activity(
    category: str | None = None,
    market: str | None = None,
    side: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    min_stake: float | None = None,
    limit: int = 100,
) -> list[dict]:
    pool = _build_activity_pool()
    return _filter(pool, category, market, side, date_from, date_to, min_stake, limit)


def list_categories() -> list[dict]:
    return [{"id": k, "label": v["label"]} for k, v in CATEGORIES.items()]


def _enrich_categories(markets: list[dict]) -> list[dict]:
    out = []
    for m in markets:
        title = (m.get("market") or "").lower()
        cat = "economy"
        for cid, meta in CATEGORIES.items():
            if any(t in title for t in meta["tags"]):
                cat = cid
                break
        out.append({**m, "category": cat, "categoryLabel": CATEGORIES[cat]["label"]})
    return out


def _demo_markets() -> list[dict]:
    now = datetime.now(timezone.utc).isoformat()
    return [
        {"market": "Ceasefire in Ukraine before Dec 2026?", "platform": "Polymarket", "yes": 0.34, "no": 0.66, "volume24h": "$1.8M", "category": "geopolitics", "categoryLabel": "Geopolitics & War", "timestamp": now},
        {"market": "US military action against Iran in 2026?", "platform": "Kalshi", "yes": 0.18, "no": 0.82, "volume24h": "$920K", "category": "geopolitics", "categoryLabel": "Geopolitics & War", "timestamp": now},
        {"market": "Taylor Swift announces engagement in 2026?", "platform": "Polymarket", "yes": 0.41, "no": 0.59, "volume24h": "$340K", "category": "entertainment", "categoryLabel": "Celebrity & Culture", "timestamp": now},
        {"market": "Royal wedding announced in UK in 2026?", "platform": "Polymarket", "yes": 0.28, "no": 0.72, "volume24h": "$210K", "category": "entertainment", "categoryLabel": "Celebrity & Culture", "timestamp": now},
        {"market": "Trump wins 2028 Republican nomination?", "platform": "Polymarket", "yes": 0.72, "no": 0.28, "volume24h": "$4.2M", "category": "politics", "categoryLabel": "Politics & Elections", "timestamp": now},
        {"market": "Fed cuts rates 3+ times in 2026?", "platform": "Kalshi", "yes": 0.55, "no": 0.45, "volume24h": "$2.1M", "category": "economy", "categoryLabel": "Economy & Fed", "timestamp": now},
        {"market": "BTC above $150K by end of 2026?", "platform": "Polymarket", "yes": 0.38, "no": 0.62, "volume24h": "$3.4M", "category": "crypto", "categoryLabel": "Crypto Events", "timestamp": now},
        {"market": "OpenAI releases GPT-5 before July 2026?", "platform": "Polymarket", "yes": 0.47, "no": 0.53, "volume24h": "$680K", "category": "science", "categoryLabel": "Science & Tech", "timestamp": now},
    ]


def _build_activity_pool() -> list[dict]:
    now = datetime.now(timezone.utc)
    offsets = [3, 8, 15, 22, 35, 48, 60, 90, 120, 180, 240, 300, 360, 420]
    demos = [
        ("geopolitics", "Ceasefire in Ukraine before Dec 2026?", "GeoTrader_7", "Yes", 0.34, 8500, 1240),
        ("geopolitics", "Ceasefire in Ukraine before Dec 2026?", "WarDesk", "No", 0.66, 4200, 1240),
        ("geopolitics", "US military action against Iran in 2026?", "RiskAnalyst", "Yes", 0.18, 1200, 567),
        ("geopolitics", "US military action against Iran in 2026?", "PeaceOptimist", "No", 0.82, 3500, 567),
        ("entertainment", "Taylor Swift announces engagement in 2026?", "SwiftieBets", "Yes", 0.41, 450, 892),
        ("entertainment", "Taylor Swift announces engagement in 2026?", "PopCultureCap", "No", 0.59, 200, 892),
        ("entertainment", "Royal wedding announced in UK in 2026?", "CrownWatcher", "Yes", 0.28, 800, 334),
        ("politics", "Trump wins 2028 Republican nomination?", "PoliticalEdge", "Yes", 0.72, 15000, 2100),
        ("politics", "Trump wins 2028 Republican nomination?", "OppositionFund", "No", 0.28, 6000, 2100),
        ("economy", "Fed cuts rates 3+ times in 2026?", "MacroMike", "Yes", 0.55, 9000, 1567),
        ("economy", "Fed cuts rates 3+ times in 2026?", "InflationHawk", "No", 0.45, 5500, 1567),
        ("crypto", "BTC above $150K by end of 2026?", "CryptoWhale", "Yes", 0.38, 22000, 3400),
        ("crypto", "BTC above $150K by end of 2026?", "BearMarketBob", "No", 0.62, 8000, 3400),
        ("science", "OpenAI releases GPT-5 before July 2026?", "AIInsider", "Yes", 0.47, 3200, 445),
    ]
    out = []
    for i, (cat, market, bettor, pick, yes_price, stake, market_bets) in enumerate(demos):
        ts = (now - timedelta(minutes=offsets[i % len(offsets)])).isoformat()
        side = "yes" if pick.lower() == "yes" else "no"
        out.append(
            {
                "id": f"pred-{cat}-{i}",
                "category": cat,
                "categoryLabel": CATEGORIES[cat]["label"],
                "market": market,
                "bettor": bettor,
                "pick": pick,
                "side": side,
                "yesPrice": yes_price,
                "stake": stake,
                "marketBetCount": market_bets,
                "platform": "Polymarket",
                "timestamp": ts,
                "note": f"{market_bets} positions on this market",
            }
        )
    return out


def _filter(
    items, category, market, side, date_from, date_to, min_stake, limit
) -> list[dict]:
    filtered = []
    for item in items:
        if category and item.get("category") != category:
            continue
        if market and market.lower() not in item.get("market", "").lower():
            continue
        if side and item.get("side", "").lower() != side.lower():
            continue
        if min_stake and (item.get("stake") or 0) < min_stake:
            continue
        ts = item.get("timestamp", "")
        if date_from and ts[:19] < date_from[:19]:
            continue
        if date_to and ts[:19] > date_to[:19]:
            continue
        filtered.append(item)
    return filtered[:limit]
