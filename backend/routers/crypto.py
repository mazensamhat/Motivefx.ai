from fastapi import APIRouter, Query

from deps.modules import require_module
from services import coinstats, coingecko, crypto_activity, polymarket

router = APIRouter(prefix="/api/crypto", tags=["crypto"])


@router.get("/whale-alerts")
async def whale_alerts():
    return {"items": await coinstats.fetch_whale_alerts()}


@router.get("/prediction-odds")
async def prediction_odds():
    return {"items": await polymarket.fetch_top_markets()}


@router.get("/trending")
async def trending():
    return {"items": await coingecko.fetch_trending()}


@router.get("/activity")
async def crypto_activity_feed(
    user_id: str = Query(default="demo"),
    symbol: str | None = None,
    side: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    min_amount: float | None = None,
    min_price: float | None = None,
    max_price: float | None = None,
    limit: int = Query(default=50, le=200),
):
    require_module(user_id, "crypto")
    items = await crypto_activity.fetch_crypto_activity(
        symbol=symbol,
        side=side,
        date_from=date_from,
        date_to=date_to,
        min_amount=min_amount,
        min_price=min_price,
        max_price=max_price,
        limit=limit,
    )
    return {"items": items, "count": len(items)}
