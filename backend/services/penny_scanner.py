"""Pink slip / penny stock scanner — sub-$5 movers and volume spikes (yfinance free)."""

import contextlib
import io
import logging
import time
from datetime import datetime, timezone

# Active liquid names only — delisted symbols removed (MULN, NKLA, CEI, GOEV, FFIE, TELL, BITF, PROG, etc.)
PENNY_WATCHLIST = [
    "SNDL", "AMC", "CLOV", "BNGO", "SENS", "OPEN", "BBAI",
    "PLUG", "FCEL", "TLRY", "NOK", "LCID", "RIOT", "MARA",
    "HUT", "CLSK", "CORZ", "WULF", "GRAB", "SOFI", "NIO",
    "ACHR", "JOBY", "RXRX",
]

_CACHE: dict[str, tuple[float, list[dict]]] = {}
_CACHE_TTL = 120  # seconds — avoids hammering yfinance on live-feed polls

logging.getLogger("yfinance").setLevel(logging.CRITICAL)


def scan_penny_movers(max_price: float = 5.0) -> list[dict]:
    cache_key = f"movers_{max_price}"
    cached = _get_cache(cache_key)
    if cached is not None:
        return cached

    try:
        import yfinance as yf
    except ImportError:
        return _demo_movers()

    movers: list[dict] = []
    now = datetime.now(timezone.utc).isoformat()
    symbols = PENNY_WATCHLIST[:20]

    try:
        with contextlib.redirect_stderr(io.StringIO()):
            data = yf.download(
                " ".join(symbols),
                period="5d",
                group_by="ticker",
                progress=False,
                threads=False,
                auto_adjust=True,
            )
    except Exception:
        return _set_cache(cache_key, _demo_movers())

    if data is None or data.empty:
        return _set_cache(cache_key, _demo_movers())

    for sym in symbols:
        try:
            price, vol_today, vol_avg, chg = _extract_bars(data, sym)
            if price <= 0 or price > max_price:
                continue
            vol_ratio = vol_today / max(vol_avg, 1)
            if vol_ratio < 1.5 and abs(chg) < 3:
                continue
            movers.append(
                {
                    "symbol": sym,
                    "price": round(price, 4),
                    "changePct": round(chg, 2),
                    "volume": vol_today,
                    "volRatio": round(vol_ratio, 1),
                    "sentiment": "bullish" if chg >= 0 else "bearish",
                    "note": f"Vol {vol_ratio:.1f}x avg — {'breakout' if chg > 5 else 'unusual activity'}",
                    "timestamp": now,
                }
            )
        except Exception:
            continue

    movers.sort(key=lambda x: x.get("volRatio", 0), reverse=True)
    result = movers[:20] if movers else _demo_movers()
    return _set_cache(cache_key, result)


def scan_volume_spikes() -> list[dict]:
    movers = scan_penny_movers()
    spikes = [m for m in movers if m.get("volRatio", 0) >= 2.0][:15]
    return spikes or _demo_movers()[:5]


def fetch_penny_quotes(symbols: list[str]) -> dict[str, float]:
    from services import yfinance_scanner
    return yfinance_scanner.fetch_quotes(symbols)


def _extract_bars(data, sym: str) -> tuple[float, int, int, float]:
    """Parse single-symbol or multi-symbol yfinance download frame."""
    import pandas as pd

    if isinstance(data.columns, pd.MultiIndex):
        if sym not in data.columns.get_level_values(0):
            raise ValueError("no data")
        frame = data[sym].dropna(how="all")
    else:
        frame = data.dropna(how="all")

    if frame.empty or len(frame) < 1:
        raise ValueError("empty")

    close = frame["Close"].dropna()
    volume = frame["Volume"].dropna()
    if close.empty:
        raise ValueError("no close")

    price = float(close.iloc[-1])
    vol_today = int(volume.iloc[-1]) if len(volume) else 0
    vol_avg = int(volume.mean()) if len(volume) > 1 else vol_today
    chg = 0.0
    if len(close) >= 2:
        chg = ((close.iloc[-1] - close.iloc[-2]) / close.iloc[-2]) * 100
    return price, vol_today, vol_avg, chg


def _get_cache(key: str) -> list[dict] | None:
    entry = _CACHE.get(key)
    if entry and time.monotonic() - entry[0] < _CACHE_TTL:
        return entry[1]
    return None


def _set_cache(key: str, value: list[dict]) -> list[dict]:
    _CACHE[key] = (time.monotonic(), value)
    return value


def _demo_movers() -> list[dict]:
    now = datetime.now(timezone.utc).isoformat()
    return [
        {"symbol": "SNDL", "price": 0.42, "changePct": 12.4, "volume": 48_200_000, "volRatio": 4.2, "sentiment": "bullish", "note": "Vol 4.2x avg — breakout on cannabis sector news", "timestamp": now},
        {"symbol": "AMC", "price": 4.85, "changePct": 8.1, "volume": 22_100_000, "volRatio": 3.1, "sentiment": "bullish", "note": "Vol 3.1x avg — meme momentum returning", "timestamp": now},
        {"symbol": "OPEN", "price": 2.15, "changePct": 9.6, "volume": 18_400_000, "volRatio": 3.4, "sentiment": "bullish", "note": "Vol 3.4x avg — housing beta play active", "timestamp": now},
        {"symbol": "BBAI", "price": 1.82, "changePct": 14.2, "volume": 31_200_000, "volRatio": 5.1, "sentiment": "bullish", "note": "Vol 5.1x avg — AI penny momentum", "timestamp": now},
        {"symbol": "BNGO", "price": 1.24, "changePct": 15.3, "volume": 12_300_000, "volRatio": 3.9, "sentiment": "bullish", "note": "Vol 3.9x avg — biotech catalyst watch", "timestamp": now},
        {"symbol": "SENS", "price": 0.89, "changePct": 6.8, "volume": 8_900_000, "volRatio": 2.4, "sentiment": "bullish", "note": "Vol 2.4x avg — accumulation pattern", "timestamp": now},
    ]
