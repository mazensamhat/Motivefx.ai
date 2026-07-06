"""Unusual options scanner via yfinance (free)."""

import contextlib
import io
import logging
from datetime import datetime, timezone

logging.getLogger("yfinance").setLevel(logging.CRITICAL)

WATCHLIST = [
    "SPY", "QQQ", "AAPL", "NVDA", "TSLA", "MSFT", "AMZN", "META",
    "GOOGL", "AMD", "COIN", "MARA", "PLTR", "SOFI", "GME",
]


def scan_unusual_options(tickers: list[str] | None = None, min_vol_oi: float = 2.5) -> list[dict]:
    try:
        import yfinance as yf
    except ImportError:
        return _demo()

    symbols = tickers or WATCHLIST
    unusual: list[dict] = []
    now = datetime.now(timezone.utc).isoformat()

    for sym in symbols[:20]:
        try:
            t = yf.Ticker(sym)
            exps = list(t.options or [])[:4]
            for exp in exps:
                chain = t.option_chain(exp)
                for side, df in [("call", chain.calls), ("put", chain.puts)]:
                    for _, row in df.iterrows():
                        vol = int(row.get("volume") or 0)
                        oi = int(row.get("openInterest") or 0)
                        last = float(row.get("lastPrice") or 0)
                        if vol < 100 or last <= 0:
                            continue
                        ratio = vol / max(oi, 1)
                        if ratio < min_vol_oi:
                            continue
                        premium = vol * last * 100
                        unusual.append(
                            {
                                "symbol": sym,
                                "type": side,
                                "strike": float(row.get("strike", 0)),
                                "expiry": exp,
                                "volume": vol,
                                "openInterest": oi,
                                "premium": round(premium, 0),
                                "volOiRatio": round(ratio, 1),
                                "sentiment": "bullish" if side == "call" else "bearish",
                                "note": f"Vol/OI {ratio:.1f}x — {'block' if premium > 100_000 else 'unusual'} flow",
                                "timestamp": now,
                            }
                        )
        except Exception:
            continue

    unusual.sort(key=lambda x: x.get("premium", 0), reverse=True)
    return unusual[:25] or _demo()


def fetch_quotes(symbols: list[str]) -> dict[str, float]:
    try:
        import yfinance as yf
        if not symbols:
            return {}
        with contextlib.redirect_stderr(io.StringIO()):
            data = yf.download(
                " ".join(symbols[:20]),
                period="1d",
                progress=False,
                threads=False,
            )
        prices: dict[str, float] = {}
        if data.empty:
            for s in symbols:
                try:
                    info = yf.Ticker(s).fast_info
                    prices[s] = float(getattr(info, "last_price", 0) or 0)
                except Exception:
                    pass
            return prices
        close = data["Close"]
        if hasattr(close, "columns"):
            for col in close.columns:
                val = close[col].dropna()
                if len(val):
                    prices[str(col)] = float(val.iloc[-1])
        else:
            val = close.dropna()
            if len(val) and len(symbols) == 1:
                prices[symbols[0]] = float(val.iloc[-1])
        return prices
    except Exception:
        return {}


def _demo() -> list[dict]:
    now = datetime.now(timezone.utc).isoformat()
    return [
        {
            "symbol": "NVDA",
            "type": "call",
            "strike": 950,
            "expiry": "2026-07-18",
            "volume": 12400,
            "openInterest": 820,
            "premium": 1840000,
            "volOiRatio": 15.1,
            "sentiment": "bullish",
            "note": "Vol/OI 15.1x — block flow (yfinance demo)",
            "timestamp": now,
        },
    ]
