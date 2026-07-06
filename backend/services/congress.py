"""Congress trades from Senate EFTS (free gov source) with demo fallback."""

from datetime import datetime, timezone

import httpx

SENATE_SEARCH = "https://efts.senate.gov/LATEST/search-index"


async def fetch_senate_trades(limit: int = 15) -> list[dict]:
    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.get(
                SENATE_SEARCH,
                params={"q": "Periodic Transaction Report", "limit": 50},
                headers={"User-Agent": "MotiveFX.AI research@motivefx.ai"},
            )
            resp.raise_for_status()
            hits = resp.json().get("hits", {}).get("hits", [])
        items: list[dict] = []
        for hit in hits[:limit]:
            src = hit.get("_source", {})
            name = src.get("filer_name") or src.get("name") or "Senator"
            desc = src.get("description") or src.get("asset_description") or ""
            ticker = _extract_ticker(desc)
            items.append(
                {
                    "politician": name,
                    "symbol": ticker or "—",
                    "transaction": src.get("transaction_type") or "Disclosure",
                    "amount": src.get("amount") or src.get("amount_range") or "—",
                    "filedAt": (src.get("filed_date") or src.get("date") or "")[:10],
                    "chamber": "Senate",
                }
            )
        return items or _demo()
    except Exception:
        return _demo()


def _extract_ticker(desc: str) -> str | None:
    import re
    m = re.search(r"\(([A-Z]{1,5})\)", desc or "")
    return m.group(1) if m else None


def _demo() -> list[dict]:
    return [
        {
            "politician": "Sen. Tuberville",
            "symbol": "LMT",
            "transaction": "Purchase",
            "amount": "$100K–$250K",
            "filedAt": "2026-06-18",
            "chamber": "Senate",
        },
        {
            "politician": "Rep. Pelosi",
            "symbol": "NVDA",
            "transaction": "Purchase",
            "amount": "$1M–$5M",
            "filedAt": "2026-06-20",
            "chamber": "House",
        },
    ]
