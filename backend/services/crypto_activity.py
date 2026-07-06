"""Crypto spot & whale activity — filterable by symbol, amount, datetime."""

from datetime import datetime, timedelta, timezone

from services import coinstats


async def fetch_crypto_activity(
    symbol: str | None = None,
    side: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    min_amount: float | None = None,
    min_price: float | None = None,
    max_price: float | None = None,
    limit: int = 100,
) -> list[dict]:
    items = await _build_pool()
    return _filter_activity(
        items, symbol, side, date_from, date_to, min_amount, min_price, max_price, limit
    )


async def _build_pool() -> list[dict]:
    now = datetime.now(timezone.utc)
    items: list[dict] = []

    whales = await coinstats.fetch_whale_alerts()
    for w in whales:
        direction = w.get("direction", "")
        side = "sell" if direction == "deposit" else "buy" if direction == "withdrawal" else "transfer"
        amt = float(w.get("amountUsd") or 0)
        crypto_amt = round(amt / _price_est(w.get("asset", "BTC")), 4)
        unit_price = round(amt / crypto_amt, 2) if crypto_amt else 0
        items.append(
            {
                "id": f"whale-{w.get('asset')}-{w.get('timestamp', '')}",
                "symbol": w.get("asset", "—"),
                "side": side,
                "amountUsd": amt,
                "amountCrypto": crypto_amt,
                "price": unit_price,
                "from": w.get("from", "unknown"),
                "to": w.get("to", "unknown"),
                "venue": "on-chain",
                "timestamp": w.get("timestamp") or now.isoformat(),
                "note": w.get("note", f"{side} flow detected"),
            }
        )

    items.extend(_demo_spot(now))
    items.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
    return items


def _demo_spot(now: datetime) -> list[dict]:
    offsets = [1, 3, 6, 10, 15, 20, 30, 45, 60, 90, 120, 180]
    demos = [
        ("BTC", "sell", 125.0, 11_775_000, "Binance Spot", "Binance", "Market sell — 125 BTC @ $94,200"),
        ("ETH", "buy", 4200.0, 12_600_000, "Coinbase Spot", "Coinbase", "Large market buy — accumulation"),
        ("SOL", "sell", 85000.0, 12_750_000, "Kraken Spot", "Kraken", "Spot dump — 85K SOL sold"),
        ("BTC", "buy", 45.5, 4_281_000, "OKX Spot", "OKX", "Block buy — institutional entry"),
        ("ETH", "sell", 2100.0, 6_300_000, "Binance Spot", "Binance", "Spot sell pressure — ETH desk"),
        ("SOL", "buy", 120000.0, 18_000_000, "Bybit Spot", "Bybit", "Whale accumulation — off-exchange move"),
        ("DOGE", "sell", 45_000_000.0, 9_000_000, "Robinhood", "Robinhood", "Retail-heavy sell cluster"),
        ("BTC", "sell", 88.0, 8_272_000, "Coinbase Spot", "Coinbase", "Spot was sold — profit taking"),
        ("ETH", "buy", 1500.0, 4_500_000, "Gemini Spot", "Gemini", "Institutional DCA buy"),
        ("SOL", "sell", 42000.0, 6_300_000, "Binance Spot", "Binance", "SOL spot sold ahead of unlock"),
    ]
    out = []
    for i, (sym, side, crypto_amt, usd, venue, exchange, note) in enumerate(demos):
        ts = (now - timedelta(minutes=offsets[i % len(offsets)])).isoformat()
        unit_price = round(usd / crypto_amt, 2) if crypto_amt else 0
        out.append(
            {
                "id": f"spot-{sym}-{i}",
                "symbol": sym,
                "side": side,
                "amountUsd": usd,
                "amountCrypto": crypto_amt,
                "price": unit_price,
                "from": exchange if side == "sell" else "Market",
                "to": "Market" if side == "sell" else exchange,
                "venue": venue,
                "timestamp": ts,
                "note": note,
            }
        )
    return out


def _price_est(sym: str) -> float:
    return {"BTC": 94000, "ETH": 3000, "SOL": 150, "DOGE": 0.2}.get(sym.upper(), 100)


def _filter_activity(
    items: list[dict],
    symbol: str | None,
    side: str | None,
    date_from: str | None,
    date_to: str | None,
    min_amount: float | None,
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
        if min_amount and (item.get("amountUsd") or 0) < min_amount:
            continue
        price = float(item.get("price") or 0)
        if min_price is not None and (price <= 0 or price < min_price):
            continue
        if max_price is not None and (price <= 0 or price > max_price):
            continue
        ts = item.get("timestamp", "")
        if date_from and ts[:19] < date_from[:19]:
            continue
        if date_to and ts[:19] > date_to[:19]:
            continue
        filtered.append(item)
    return filtered[:limit]
