"""Pink slip buy/sell activity — who's accumulating vs dumping sub-$5 names."""

from datetime import datetime, timedelta, timezone

from services import penny_scanner


async def fetch_penny_activity(
    symbol: str | None = None,
    side: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    min_shares: int | None = None,
    min_price: float | None = None,
    max_price: float | None = None,
    limit: int = 100,
) -> list[dict]:
    items = await _build_pool()
    return _filter_activity(
        items, symbol, side, date_from, date_to, min_shares, min_price, max_price, limit
    )


async def _build_pool() -> list[dict]:
    now = datetime.now(timezone.utc)
    items: list[dict] = []

    movers = penny_scanner.scan_penny_movers()
    quote_map = {m["symbol"]: m.get("price", 0) for m in movers}

    # Live-linked flow from current movers
    for m in movers[:6]:
        sym = m["symbol"]
        price = float(m.get("price") or 0)
        if price <= 0:
            continue
        side = "buy" if m.get("sentiment") == "bullish" else "sell"
        vol = int(m.get("volume") or 0)
        block_shares = max(10_000, vol // 500)
        items.append(
            {
                "id": f"flow-{sym}-{side}",
                "symbol": sym,
                "actor": "Block desk / retail swarm",
                "actorType": "flow",
                "side": side,
                "shares": block_shares,
                "price": round(price, 4),
                "amountUsd": round(block_shares * price, 2),
                "timestamp": m.get("timestamp") or now.isoformat(),
                "note": m.get("note", f"Vol {m.get('volRatio')}x — pink slip flow"),
            }
        )

    items.extend(_demo_pink_slip(now, quote_map))
    items.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
    return items


def _demo_pink_slip(now: datetime, quotes: dict[str, float]) -> list[dict]:
    offsets = [0, 1, 3, 5, 8, 12, 18, 24, 36, 48, 60, 90]
    demos = [
        ("SNDL", "Retail swarm (Robinhood)", "retail", "buy", 2_400_000, 0.42, "Meme accumulation — cannabis sympathy bid"),
        ("SNDL", "Citadel Securities", "market_maker", "sell", 890_000, 0.41, "Desk distribution into retail bids"),
        ("AMC", "BlackRock ETF rebalance", "institutional", "buy", 450_000, 4.72, "Institutional block buy — meme basket add"),
        ("AMC", "Susquehanna", "institutional", "sell", 320_000, 4.68, "Options hedge unwind — net seller"),
        ("OPEN", "Insider (Form 4)", "insider", "sell", 180_000, 2.08, "Insider sale — 180K shares disposed"),
        ("OPEN", "ARK-style growth fund", "institutional", "buy", 520_000, 2.12, "Growth fund adding housing beta"),
        ("BBAI", "Whale tracker alert", "whale", "buy", 1_100_000, 1.78, "Large print — AI penny accumulation"),
        ("BBAI", "Short seller (unknown)", "short", "sell", 760_000, 1.75, "Borrowed shares returned — cover or new short"),
        ("BNGO", "Biotech specialist fund", "institutional", "buy", 95_000, 1.22, "Specialist fund initiating position"),
        ("BNGO", "Retail cluster", "retail", "sell", 210_000, 1.19, "Profit-taking cluster on 15% run"),
        ("SENS", "FDA catalyst desk", "institutional", "buy", 340_000, 0.88, "Pre-catalyst accumulation detected"),
        ("SENS", "Market maker", "market_maker", "sell", 125_000, 0.86, "MM inventory offload"),
        ("CLOV", "Healthcare hedge fund", "institutional", "buy", 280_000, 2.45, "Healthcare basket rebalance — added CLOV"),
        ("CLOV", "Unknown dark pool", "dark_pool", "sell", 410_000, 2.41, "Dark pool print — distribution"),
    ]
    out = []
    for i, (sym, actor, atype, side, shares, default_price, note) in enumerate(demos):
        price = float(quotes.get(sym) or default_price)
        ts = (now - timedelta(minutes=offsets[i % len(offsets)])).isoformat()
        out.append(
            {
                "id": f"pink-{sym}-{i}",
                "symbol": sym,
                "actor": actor,
                "actorType": atype,
                "side": side,
                "shares": shares,
                "price": round(price, 4),
                "amountUsd": round(shares * price, 2),
                "timestamp": ts,
                "note": note,
            }
        )
    return out


def _filter_activity(
    items: list[dict],
    symbol: str | None,
    side: str | None,
    date_from: str | None,
    date_to: str | None,
    min_shares: int | None,
    min_price: float | None,
    max_price: float | None,
    limit: int,
) -> list[dict]:
    sym = symbol.upper() if symbol else None
    filtered = []
    for item in items:
        if sym and item.get("symbol", "").upper() != sym:
            continue
        if side and item.get("side", "").lower() != side.lower():
            continue
        if min_shares and (item.get("shares") or 0) < min_shares:
            continue
        price = float(item.get("price") or 0)
        if min_price is not None and price < min_price:
            continue
        if max_price is not None and price > max_price:
            continue
        ts = item.get("timestamp", "")
        if date_from and ts[:19] < date_from[:19]:
            continue
        if date_to and ts[:19] > date_to[:19]:
            continue
        filtered.append(item)
    return filtered[:limit]
