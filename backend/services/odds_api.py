"""The Odds API — line movement and sharp vs public money."""

from datetime import datetime, timezone

import httpx

from config import settings

ODDS_BASE = "https://api.the-odds-api.com/v4"


async def fetch_line_moves(sport: str = "americanfootball_nfl") -> list[dict]:
    if not settings.the_odds_api_key:
        return _demo_line_moves()

    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.get(
            f"{ODDS_BASE}/sports/{sport}/odds",
            params={
                "apiKey": settings.the_odds_api_key,
                "regions": "us",
                "markets": "h2h,spreads",
                "oddsFormat": "american",
            },
        )
        resp.raise_for_status()
        return _normalize_odds(resp.json())


async def fetch_sharp_action() -> list[dict]:
    # OddsJam / Action Network require paid tiers — demo sharp splits for MVP
    return _demo_sharp_action()


def _normalize_odds(games: list) -> list[dict]:
    items: list[dict] = []
    for game in games[:12]:
        home = game.get("home_team", "Home")
        away = game.get("away_team", "Away")
        bookmakers = game.get("bookmakers", [])
        if not bookmakers:
            continue
        market = bookmakers[0].get("markets", [{}])[0]
        outcomes = {o["name"]: o.get("price") for o in market.get("outcomes", [])}
        items.append(
            {
                "matchup": f"{away} @ {home}",
                "sport": game.get("sport_title", "—"),
                "commenceTime": game.get("commence_time"),
                "line": outcomes,
                "book": bookmakers[0].get("title"),
            }
        )
    return items or _demo_line_moves()


def _demo_line_moves() -> list[dict]:
    now = datetime.now(timezone.utc).isoformat()
    return [
        {
            "matchup": "Chiefs @ Bills",
            "sport": "NFL",
            "commenceTime": "2026-09-07T20:20:00Z",
            "openingLine": "KC -2.5",
            "currentLine": "KC -4.5",
            "movement": "-2.0",
            "direction": "sharp_on_home",
            "book": "Pinnacle",
            "timestamp": now,
        },
        {
            "matchup": "Lakers @ Celtics",
            "sport": "NBA",
            "commenceTime": "2026-06-28T00:30:00Z",
            "openingLine": "BOS -6.5",
            "currentLine": "BOS -4.0",
            "movement": "+2.5",
            "direction": "public_on_home",
            "book": "DraftKings",
            "timestamp": now,
        },
        {
            "matchup": "Yankees @ Red Sox",
            "sport": "MLB",
            "commenceTime": "2026-06-27T23:10:00Z",
            "openingLine": "NYY -1.5",
            "currentLine": "NYY -2.5",
            "movement": "-1.0",
            "direction": "sharp_on_away",
            "book": "FanDuel",
            "timestamp": now,
        },
    ]


def _demo_sharp_action() -> list[dict]:
    return [
        {
            "matchup": "Chiefs @ Bills",
            "publicPct": 78,
            "moneyPct": 32,
            "sharpSide": "Bills +4.5",
            "signal": "reverse_line_move",
            "confidence": "high",
        },
        {
            "matchup": "Lakers @ Celtics",
            "publicPct": 65,
            "moneyPct": 71,
            "sharpSide": "Celtics -4",
            "signal": "aligned_sharp",
            "confidence": "medium",
        },
        {
            "matchup": "Dodgers @ Padres",
            "publicPct": 82,
            "moneyPct": 45,
            "sharpSide": "Padres +1.5",
            "signal": "fade_public",
            "confidence": "high",
        },
    ]
