from fastapi import APIRouter, Query

from deps.modules import require_module
from db import list_bets_filtered
from services import bet_market_activity, odds_api

router = APIRouter(prefix="/api/betting", tags=["betting"])


@router.get("/sports")
async def list_sports():
    return {"items": bet_market_activity.list_sports()}


@router.get("/line-moves")
async def line_moves(sport: str = Query(default="americanfootball_nfl")):
    return {"items": await odds_api.fetch_line_moves(sport)}


@router.get("/sharp-action")
async def sharp_action():
    return {"items": await odds_api.fetch_sharp_action()}


@router.get("/activity")
async def betting_activity(
    user_id: str = Query(default="demo"),
    matchup: str | None = None,
    sport: str | None = None,
    status: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    min_stake: float | None = None,
    limit: int = Query(default=50, le=200),
):
    require_module(user_id, "betting")
    bets = list_bets_filtered(
        user_id,
        matchup=matchup,
        sport=sport,
        status=status,
        date_from=date_from,
        date_to=date_to,
        min_stake=min_stake,
        limit=limit,
    )
    total_stake = sum(float(b.get("stake") or 0) for b in bets)
    return {"items": bets, "count": len(bets), "totalStake": round(total_stake, 2)}


@router.get("/market-activity")
async def market_activity(
    user_id: str = Query(default="demo"),
    sport: str | None = None,
    matchup: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    min_stake: float | None = None,
    min_bets: int | None = None,
    limit: int = Query(default=50, le=200),
):
    require_module(user_id, "betting")
    bets, summaries = await bet_market_activity.fetch_market_activity(
        sport=sport,
        matchup=matchup,
        date_from=date_from,
        date_to=date_to,
        min_stake=min_stake,
        min_bets=min_bets,
        limit=limit,
    )
    return {"items": bets, "summaries": summaries, "count": len(bets)}
