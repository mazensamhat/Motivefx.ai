"""Keep Trades (block flow) and Pink Slips (sub-$5) symbol universes separate."""

from __future__ import annotations

from fastapi import HTTPException

from services.penny_scanner import PENNY_WATCHLIST
from services.yfinance_scanner import WATCHLIST as TRADES_WATCHLIST

PINK_SLIP_MAX_PRICE = 5.0


def _normalize(symbol: str) -> str:
    return symbol.upper().strip().lstrip("$")


def _fetch_price(symbol: str) -> float | None:
    from services import yfinance_scanner

    quotes = yfinance_scanner.fetch_quotes([symbol])
    price = quotes.get(_normalize(symbol))
    if price is None or price <= 0:
        return None
    return float(price)


def classify_symbol(symbol: str, *, price: float | None = None) -> str:
    """
    Classify a ticker for module routing.
    Returns 'pink_slip', 'trades', or 'unknown'.
    """
    sym = _normalize(symbol)
    if not sym:
        return "unknown"

    live = price if price is not None else _fetch_price(sym)
    if live is not None:
        return "pink_slip" if live <= PINK_SLIP_MAX_PRICE else "trades"

    if sym in {_normalize(s) for s in PENNY_WATCHLIST}:
        return "pink_slip"
    if sym in {_normalize(s) for s in TRADES_WATCHLIST}:
        return "trades"
    return "unknown"


def validate_symbol_for_module(symbol: str, module: str, *, price: float | None = None) -> None:
    """Raise HTTP 400 if symbol does not belong in the given module ledger."""
    sym = _normalize(symbol)
    if not sym:
        raise HTTPException(status_code=400, detail="Symbol is required.")

    bucket = classify_symbol(sym, price=price)

    if module == "trades":
        if bucket == "pink_slip":
            raise HTTPException(
                status_code=400,
                detail={
                    "code": "wrong_module",
                    "module": "penny",
                    "symbol": sym,
                    "message": (
                        f"${sym} is a Pink Slip (sub-${PINK_SLIP_MAX_PRICE:.0f}) name — "
                        "track it in Pink Slips, not Trades."
                    ),
                },
            )
        return

    if module == "penny":
        if bucket == "trades":
            raise HTTPException(
                status_code=400,
                detail={
                    "code": "wrong_module",
                    "module": "trades",
                    "symbol": sym,
                    "message": (
                        f"${sym} is a Trades / block-flow symbol — "
                        "add it in Trades, not Pink Slips."
                    ),
                },
            )
        if bucket == "unknown":
            raise HTTPException(
                status_code=400,
                detail={
                    "code": "wrong_module",
                    "module": "penny",
                    "symbol": sym,
                    "message": (
                        f"${sym} is not in the Pink Slip universe (sub-${PINK_SLIP_MAX_PRICE:.0f}). "
                        "Use Trades for large-cap / options-flow research."
                    ),
                },
            )
        return

    raise ValueError(f"Unsupported module for symbol validation: {module}")


def validate_portfolio_for_module(holdings: list[dict], module: str) -> None:
    for h in holdings:
        sym = h.get("symbol") or ""
        validate_symbol_for_module(str(sym), module)
