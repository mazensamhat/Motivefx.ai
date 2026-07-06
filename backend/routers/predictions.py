from fastapi import APIRouter, Query

from deps.modules import require_module
from services import prediction_markets

router = APIRouter(prefix="/api/predictions", tags=["predictions"])


@router.get("/categories")
async def list_categories():
    return {"items": prediction_markets.list_categories()}


@router.get("/markets")
async def markets(category: str | None = None, limit: int = Query(default=20, le=50)):
    return {"items": await prediction_markets.fetch_markets(category=category, limit=limit)}


@router.get("/activity")
async def prediction_activity(
    user_id: str = Query(default="demo"),
    category: str | None = None,
    market: str | None = None,
    side: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    min_stake: float | None = None,
    limit: int = Query(default=50, le=200),
):
    require_module(user_id, "predictions")
    items = await prediction_markets.fetch_prediction_activity(
        category=category,
        market=market,
        side=side,
        date_from=date_from,
        date_to=date_to,
        min_stake=min_stake,
        limit=limit,
    )
    return {"items": items, "count": len(items)}
