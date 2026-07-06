"""CoinGecko free API — prices and trending."""

import httpx

CG = "https://api.coingecko.com/api/v3"


async def fetch_prices(symbols: list[str]) -> dict[str, float]:
    if not symbols:
        return {}
    ids = _symbol_to_ids(symbols)
    if not ids:
        return {}
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(
                f"{CG}/simple/price",
                params={"ids": ",".join(ids), "vs_currencies": "usd"},
            )
            resp.raise_for_status()
            data = resp.json()
        id_to_sym = {v: k for k, v in ids.items()}
        return {id_to_sym[i]: float(data[i]["usd"]) for i in data if i in id_to_sym}
    except Exception:
        return {s: 0.0 for s in symbols}


async def fetch_trending() -> list[dict]:
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(f"{CG}/search/trending")
            resp.raise_for_status()
            coins = resp.json().get("coins", [])
        return [
            {
                "symbol": c.get("item", {}).get("symbol", "").upper(),
                "name": c.get("item", {}).get("name"),
                "rank": c.get("item", {}).get("market_cap_rank"),
            }
            for c in coins[:10]
        ]
    except Exception:
        return [{"symbol": "BTC", "name": "Bitcoin", "rank": 1}]


def _symbol_to_ids(symbols: list[str]) -> dict[str, str]:
    mapping = {
        "BTC": "bitcoin", "ETH": "ethereum", "SOL": "solana", "XRP": "ripple",
        "DOGE": "dogecoin", "ADA": "cardano", "AVAX": "avalanche-2", "LINK": "chainlink",
        "DOT": "polkadot", "MATIC": "matic-network", "UNI": "uniswap", "ATOM": "cosmos",
        "LTC": "litecoin", "NEAR": "near", "APT": "aptos", "ARB": "arbitrum",
        "OP": "optimism", "PEPE": "pepe", "SHIB": "shiba-inu", "USDT": "tether",
        "USDC": "usd-coin", "BNB": "binancecoin", "TON": "the-open-network",
    }
    return {s.upper(): mapping[s.upper()] for s in symbols if s.upper() in mapping}
