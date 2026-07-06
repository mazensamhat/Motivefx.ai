"""Sports betting marketplace activity — who's betting, volume per game."""

from datetime import datetime, timedelta, timezone

SPORTS = {
    "football": {"label": "Football (NFL)", "aliases": ["nfl", "football", "american football"]},
    "basketball": {"label": "Basketball (NBA)", "aliases": ["nba", "basketball"]},
    "baseball": {"label": "Baseball (MLB)", "aliases": ["mlb", "baseball"]},
    "hockey": {"label": "Hockey (NHL)", "aliases": ["nhl", "hockey"]},
    "soccer": {"label": "Soccer", "aliases": ["soccer", "mls", "epl", "premier league"]},
    "mma": {"label": "MMA / UFC", "aliases": ["ufc", "mma"]},
    "tennis": {"label": "Tennis", "aliases": ["tennis", "atp", "wta"]},
}


async def fetch_market_activity(
    sport: str | None = None,
    matchup: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    min_stake: float | None = None,
    min_bets: int | None = None,
    limit: int = 100,
) -> tuple[list[dict], list[dict]]:
    """Returns (individual_bets, game_summaries)."""
    pool = _build_pool()
    filtered = _filter(pool, sport, matchup, date_from, date_to, min_stake, limit)
    summaries = _summarize_by_game(filtered, min_bets)
    return filtered, summaries


def list_sports() -> list[dict]:
    return [{"id": k, "label": v["label"]} for k, v in SPORTS.items()]


def _build_pool() -> list[dict]:
    now = datetime.now(timezone.utc)
    offsets = [2, 5, 8, 12, 18, 25, 35, 45, 60, 90, 120, 180, 240, 300]
    demos = [
        ("football", "Chiefs @ Bills", "SharpBettor_42", "Bills +4.5", "-110", 2500, 847),
        ("football", "Chiefs @ Bills", "PublicFade99", "Chiefs -4.5", "-105", 150, 847),
        ("football", "Chiefs @ Bills", "VegasInsider", "Bills ML", "+165", 5000, 847),
        ("football", "Eagles @ Cowboys", "CowboysFan_TX", "Cowboys -3", "-115", 400, 312),
        ("football", "Eagles @ Cowboys", "PhillyEdge", "Eagles +3", "-105", 800, 312),
        ("basketball", "Lakers @ Celtics", "CelticsGreen", "Celtics -4", "-115", 300, 521),
        ("basketball", "Lakers @ Celtics", "LeBronLegacy", "Lakers +4", "-105", 200, 521),
        ("basketball", "Lakers @ Celtics", "ProCapper", "Under 218.5", "-110", 1200, 521),
        ("basketball", "Warriors @ Suns", "DubNation", "Warriors +2.5", "-110", 450, 198),
        ("baseball", "Yankees @ Red Sox", "BronxBomber", "Yankees -1.5", "-105", 175, 276),
        ("baseball", "Yankees @ Red Sox", "FenwayFaithful", "Red Sox +1.5", "+120", 100, 276),
        ("baseball", "Dodgers @ Padres", "SoCalSharp", "Padres +1.5", "+120", 600, 389),
        ("baseball", "Dodgers @ Padres", "BlueHeaven", "Dodgers ML", "-140", 350, 389),
        ("hockey", "Rangers @ Bruins", "HockeyHub", "Bruins -1.5", "+130", 225, 143),
        ("hockey", "Rangers @ Bruins", "NYR_Fan", "Rangers ML", "+155", 150, 143),
        ("hockey", "Oilers @ Panthers", "StanleyChase", "Over 6.5", "-115", 400, 167),
        ("soccer", "Man City @ Arsenal", "PremTracker", "Arsenal +0.5", "-110", 500, 234),
        ("soccer", "Man City @ Arsenal", "CityTillIDie", "Man City ML", "+145", 300, 234),
        ("soccer", "Real Madrid @ Barcelona", "ElClasico", "Draw", "+260", 200, 891),
        ("soccer", "Real Madrid @ Barcelona", "Madridista", "Real Madrid DNB", "+110", 750, 891),
        ("mma", "Jones vs Miocic", "FightNight", "Jones by KO", "+180", 100, 412),
        ("mma", "Jones vs Miocic", "UnderdogHunter", "Miocic +250", "+250", 50, 412),
        ("tennis", "Djokovic vs Alcaraz", "GrandSlamPro", "Alcaraz -1.5 sets", "+120", 300, 156),
    ]
    out = []
    for i, (sport, matchup, bettor, pick, odds, stake, game_bets) in enumerate(demos):
        ts = (now - timedelta(minutes=offsets[i % len(offsets)])).isoformat()
        out.append(
            {
                "id": f"market-{sport}-{i}",
                "sport": sport,
                "sportLabel": SPORTS[sport]["label"],
                "matchup": matchup,
                "bettor": bettor,
                "pick": pick,
                "odds": odds,
                "stake": stake,
                "gameBetCount": game_bets,
                "timestamp": ts,
                "note": f"{game_bets} bets entered on this game",
            }
        )
    return out


def _summarize_by_game(items: list[dict], min_bets: int | None) -> list[dict]:
    by_game: dict[str, dict] = {}
    for item in items:
        key = f"{item['sport']}::{item['matchup']}"
        if key not in by_game:
            by_game[key] = {
                "sport": item["sport"],
                "sportLabel": item["sportLabel"],
                "matchup": item["matchup"],
                "betCount": item["gameBetCount"],
                "totalStake": 0.0,
                "topPick": item["pick"],
                "lastActivity": item["timestamp"],
            }
        by_game[key]["totalStake"] += float(item.get("stake") or 0)
        if item["timestamp"] > by_game[key]["lastActivity"]:
            by_game[key]["lastActivity"] = item["timestamp"]

    summaries = list(by_game.values())
    summaries.sort(key=lambda x: x["betCount"], reverse=True)
    if min_bets:
        summaries = [s for s in summaries if s["betCount"] >= min_bets]
    return summaries


def _filter(
    items: list[dict],
    sport: str | None,
    matchup: str | None,
    date_from: str | None,
    date_to: str | None,
    min_stake: float | None,
    limit: int,
) -> list[dict]:
    sport_key = sport.lower() if sport else None
    filtered = []
    for item in items:
        if sport_key and item.get("sport", "").lower() != sport_key:
            continue
        if matchup and matchup.lower() not in item.get("matchup", "").lower():
            continue
        if min_stake and (item.get("stake") or 0) < min_stake:
            continue
        ts = item.get("timestamp", "")
        if date_from and ts[:19] < date_from[:19]:
            continue
        if date_to and ts[:19] > date_to[:19]:
            continue
        filtered.append(item)
    return filtered[:limit]
