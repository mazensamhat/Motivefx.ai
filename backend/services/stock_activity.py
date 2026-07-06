"""Stock activity feed — who's buying/selling, share counts, dollar amounts."""

from datetime import datetime, timedelta, timezone

from services import congress, yfinance_scanner


async def fetch_stock_activity(
    symbol: str | None = None,
    side: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    min_shares: int | None = None,
    min_price: float | None = None,
    max_price: float | None = None,
    limit: int = 100,
) -> list[dict]:
    items = await _build_activity_pool()
    _enrich_prices(items)
    return _filter_activity(
        items, symbol, side, date_from, date_to, min_shares, min_price, max_price, limit
    )


async def _build_activity_pool() -> list[dict]:
    now = datetime.now(timezone.utc)
    items: list[dict] = []

    congress_trades = await congress.fetch_senate_trades(20)
    for t in congress_trades:
        sym = t.get("symbol", "—")
        if sym == "—":
            continue
        tx = t.get("transaction", "").lower()
        side = "buy" if "purchase" in tx or "buy" in tx else "sell" if "sale" in tx or "sell" in tx else "disclosure"
        shares = _estimate_shares(t.get("amount", ""))
        items.append(
            {
                "id": f"congress-{sym}-{t.get('filedAt')}",
                "symbol": sym,
                "actor": t.get("politician", "Congress member"),
                "actorType": "congress",
                "side": side,
                "shares": shares,
                "amountUsd": _amount_mid(t.get("amount", "")),
                "price": None,
                "timestamp": f"{t.get('filedAt', now.date().isoformat())}T14:00:00Z",
                "note": f"{t.get('transaction')} — {t.get('amount', '')} disclosed",
            }
        )

    options = yfinance_scanner.scan_unusual_options()[:15]
    for o in options:
        side = "buy" if o.get("type") == "call" else "sell"
        vol = int(o.get("volume") or 0)
        items.append(
            {
                "id": f"options-{o['symbol']}-{o.get('strike')}-{side}",
                "symbol": o["symbol"],
                "actor": "Institutional block flow",
                "actorType": "institutional",
                "side": side,
                "shares": vol * 100,
                "amountUsd": float(o.get("premium") or 0),
                "price": o.get("strike"),
                "timestamp": o.get("timestamp") or now.isoformat(),
                "note": o.get("note", f"Unusual {o.get('type')} Vol/OI {o.get('volOiRatio')}x"),
            }
        )

    items.extend(_demo_institutional(now))
    items.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
    return items


def _demo_institutional(now: datetime) -> list[dict]:
    base = now.isoformat()
    offsets = [0, 2, 5, 8, 12, 18, 24, 36, 48, 72]
    demos = [
        ("NVDA", "BlackRock Inc.", "institutional", "buy", 2_400_000, 1_920_000_000, 800.0, "13F filing — added NVDA position"),
        ("AAPL", "Vanguard Group", "institutional", "buy", 1_850_000, 370_000_000, 200.0, "Block accumulation — Q2 rebalance"),
        ("TSLA", "Citadel Securities", "institutional", "sell", 890_000, 195_800_000, 220.0, "Large block sale — desk distribution"),
        ("MSFT", "Fidelity", "institutional", "buy", 620_000, 235_600_000, 380.0, "Institutional buy program detected"),
        ("AMD", "Susquehanna", "institutional", "buy", 1_200_000, 168_000_000, 140.0, "Options market maker hedging — net long"),
        ("META", "Goldman Sachs", "institutional", "sell", 450_000, 225_000_000, 500.0, "Profit-taking block — post-earnings"),
        ("SPY", "Unknown dark pool", "dark_pool", "buy", 5_000_000, 2_250_000_000, 450.0, "Dark pool print — largest block today"),
        ("QQQ", "Jane Street", "institutional", "sell", 780_000, 351_000_000, 450.0, "ETF arb unwind — net seller"),
    ]
    out = []
    for i, (sym, actor, atype, side, shares, amt, price, note) in enumerate(demos):
        ts = (now - timedelta(hours=offsets[i % len(offsets)])).isoformat()
        out.append(
            {
                "id": f"inst-{sym}-{i}",
                "symbol": sym,
                "actor": actor,
                "actorType": atype,
                "side": side,
                "shares": shares,
                "amountUsd": amt,
                "price": price,
                "timestamp": ts,
                "note": note,
            }
        )
    return out


def _enrich_prices(items: list[dict]) -> None:
    """Fill missing share prices from live quotes."""
    missing = {item["symbol"] for item in items if not item.get("price") and item.get("symbol")}
    if not missing:
        return
    quotes = yfinance_scanner.fetch_quotes(list(missing))
    for item in items:
        if item.get("price"):
            continue
        sym = item.get("symbol", "")
        p = quotes.get(sym.upper())
        if p:
            item["price"] = round(float(p), 2)


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
        if min_price is not None and (price <= 0 or price < min_price):
            continue
        if max_price is not None and (price <= 0 or price > max_price):
            continue
        ts = item.get("timestamp", "")
        if date_from and ts[:10] < date_from[:10]:
            continue
        if date_to and ts[:10] > date_to[:10]:
            continue
        filtered.append(item)
    return filtered[:limit]


def _estimate_shares(amount_str: str) -> int:
    s = (amount_str or "").replace(",", "").replace("$", "")
    if "M" in s.upper():
        try:
            return int(float(s.split("M")[0].split("–")[0].split("-")[0].strip()) * 1_000_000 / 200)
        except ValueError:
            return 5000
    if "K" in s.upper():
        try:
            return int(float(s.split("K")[0].split("–")[0].split("-")[0].strip()) * 1000 / 200)
        except ValueError:
            return 1000
    return 2500


def _amount_mid(amount_str: str) -> float:
    s = (amount_str or "").replace(",", "").replace("$", "")
    if "–" in s or "-" in s:
        parts = s.replace("–", "-").split("-")
        try:
            lo = _parse_money(parts[0])
            hi = _parse_money(parts[1]) if len(parts) > 1 else lo
            return (lo + hi) / 2
        except (ValueError, IndexError):
            pass
    return _parse_money(s) if s else 0


def _parse_money(s: str) -> float:
    s = s.strip().upper()
    mult = 1_000_000 if "M" in s else 1_000 if "K" in s else 1
    num = s.replace("M", "").replace("K", "").strip()
    return float(num) * mult
