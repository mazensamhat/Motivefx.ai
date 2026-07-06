from fastapi import APIRouter, Query

from deps.modules import require_module
from services import penny_scanner, penny_activity

router = APIRouter(prefix="/api/penny", tags=["penny"])


@router.get("/movers")
async def penny_movers(user_id: str = Query(default="demo")):
    require_module(user_id, "penny")
    return {"items": penny_scanner.scan_penny_movers()}


@router.get("/volume-spikes")
async def volume_spikes(user_id: str = Query(default="demo")):
    require_module(user_id, "penny")
    return {"items": penny_scanner.scan_volume_spikes()}


@router.get("/activity")
async def penny_activity_feed(
    user_id: str = Query(default="demo"),
    symbol: str | None = None,
    side: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    min_shares: int | None = None,
    min_price: float | None = None,
    max_price: float | None = None,
    limit: int = Query(default=50, le=200),
):
    require_module(user_id, "penny")
    items = await penny_activity.fetch_penny_activity(
        symbol=symbol,
        side=side,
        date_from=date_from,
        date_to=date_to,
        min_shares=min_shares,
        min_price=min_price,
        max_price=max_price,
        limit=limit,
    )
    return {"items": items, "count": len(items)}
