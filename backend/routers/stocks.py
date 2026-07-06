from fastapi import APIRouter, Query

from deps.modules import require_module
from services import congress, stock_activity, yfinance_scanner

router = APIRouter(prefix="/api/stocks", tags=["stocks"])


@router.get("/unusual-options")
async def unusual_options(user_id: str = Query(default="demo")):
    require_module(user_id, "trades")
    return {"items": yfinance_scanner.scan_unusual_options()}


@router.get("/congress-trades")
async def congress_trades(user_id: str = Query(default="demo")):
    require_module(user_id, "trades")
    return {"items": await congress.fetch_senate_trades()}


@router.get("/activity")
async def stock_activity_feed(
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
    require_module(user_id, "trades")
    items = await stock_activity.fetch_stock_activity(
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
