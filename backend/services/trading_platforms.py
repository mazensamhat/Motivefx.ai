"""Broker / exchange / sportsbook catalog and deep-link builders."""

from __future__ import annotations

from typing import Any

# module keys: trades, penny, crypto, betting, predictions
PLATFORM_CATALOG: dict[str, list[dict[str, str]]] = {
    "trades": [
        {"id": "robinhood", "name": "Robinhood", "urlTemplate": "https://robinhood.com/stocks/{symbol}"},
        {"id": "webull", "name": "Webull", "urlTemplate": "https://www.webull.com/quote/us/{symbol}"},
        {"id": "schwab", "name": "Charles Schwab", "urlTemplate": "https://www.schwab.com/"},
        {"id": "fidelity", "name": "Fidelity", "urlTemplate": "https://digital.fidelity.com/prgw/digital/research/quote?symbol={symbol}"},
        {"id": "etrade", "name": "E*TRADE", "urlTemplate": "https://us.etrade.com/market-monitor/research/stocks/{symbol}"},
        {"id": "tdameritrade", "name": "TD Ameritrade", "urlTemplate": "https://www.schwab.com/"},
    ],
    "penny": [
        {"id": "robinhood", "name": "Robinhood", "urlTemplate": "https://robinhood.com/stocks/{symbol}"},
        {"id": "webull", "name": "Webull", "urlTemplate": "https://www.webull.com/quote/us/{symbol}"},
        {"id": "otcbb", "name": "OTC Markets", "urlTemplate": "https://www.otcmarkets.com/stock/{symbol}/overview"},
        {"id": "tdameritrade", "name": "TD Ameritrade", "urlTemplate": "https://www.schwab.com/"},
    ],
    "crypto": [
        {"id": "coinbase", "name": "Coinbase", "urlTemplate": "https://www.coinbase.com/price/{symbol}"},
        {"id": "binance", "name": "Binance.US", "urlTemplate": "https://www.binance.us/en/trade/{symbol}_USD"},
        {"id": "kraken", "name": "Kraken", "urlTemplate": "https://pro.kraken.com/app/trade/{symbol}-usd"},
        {"id": "crypto_com", "name": "Crypto.com", "urlTemplate": "https://crypto.com/price/{symbol}"},
        {"id": "gemini", "name": "Gemini", "urlTemplate": "https://www.gemini.com/prices/{symbol}"},
    ],
    "betting": [
        {"id": "draftkings", "name": "DraftKings", "urlTemplate": "https://sportsbook.draftkings.com/"},
        {"id": "fanduel", "name": "FanDuel", "urlTemplate": "https://sportsbook.fanduel.com/"},
        {"id": "betmgm", "name": "BetMGM", "urlTemplate": "https://sports.betmgm.com/"},
        {"id": "caesars", "name": "Caesars Sportsbook", "urlTemplate": "https://www.caesars.com/sportsbook-and-casino"},
        {"id": "espn", "name": "ESPN BET", "urlTemplate": "https://espnbet.com/"},
    ],
    "predictions": [
        {"id": "polymarket", "name": "Polymarket", "urlTemplate": "https://polymarket.com/"},
        {"id": "kalshi", "name": "Kalshi", "urlTemplate": "https://kalshi.com/"},
        {"id": "predictit", "name": "PredictIt", "urlTemplate": "https://www.predictit.org/"},
        {"id": "metaculus", "name": "Metaculus", "urlTemplate": "https://www.metaculus.com/"},
    ],
}

MODULE_LABELS = {
    "trades": "Trades & Stocks",
    "penny": "Pink Slips (Penny Stocks)",
    "crypto": "Crypto",
    "betting": "Sports Betting",
    "predictions": "Prediction Markets",
}


def catalog_for_api() -> dict[str, Any]:
    return {"modules": MODULE_LABELS, "platforms": PLATFORM_CATALOG}


def find_platform(module: str, platform_id: str) -> dict[str, str] | None:
    for p in PLATFORM_CATALOG.get(module, []):
        if p["id"] == platform_id:
            return p
    return None


def build_deeplink(
    module: str,
    platform_id: str,
    *,
    symbol: str = "",
    query: str = "",
    side: str = "BUY",
    custom_url: str | None = None,
) -> str | None:
    if platform_id == "custom" and custom_url:
        return custom_url.strip()

    platform = find_platform(module, platform_id)
    if not platform:
        return None

    sym = (symbol or "").upper().replace("$", "").strip()
    q = (query or "").strip()
    url = platform["urlTemplate"]

    if "{symbol}" in url:
        if not sym and module in ("trades", "penny", "crypto"):
            sym = "BTC" if module == "crypto" else "SPY"
        url = url.replace("{symbol}", sym or "SPY")

    if "{query}" in url:
        from urllib.parse import quote_plus
        url = url.replace("{query}", quote_plus(q or sym))

    # Side hint as fragment for apps that ignore it (still opens correct destination)
    if side.upper() in ("SELL", "NO"):
        url = f"{url}#motivfx-action=sell"
    else:
        url = f"{url}#motivfx-action=buy"

    return url
