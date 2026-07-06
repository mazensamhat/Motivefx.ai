"""Rich demo portfolios — instant wow on first login."""

from datetime import datetime, timezone

from db import add_bet, add_prediction, load_portfolio, save_portfolio

DEMO_STOCKS = [
    {"symbol": "NVDA", "shares": 10, "avg_cost": 800},
    {"symbol": "AAPL", "shares": 25, "avg_cost": 175},
    {"symbol": "TSLA", "shares": 15, "avg_cost": 220},
    {"symbol": "MSFT", "shares": 12, "avg_cost": 380},
]

DEMO_CRYPTO = [
    {"symbol": "BTC", "amount": 0.42, "avg_cost": 62000},
    {"symbol": "ETH", "amount": 3.5, "avg_cost": 2800},
    {"symbol": "SOL", "amount": 120, "avg_cost": 145},
]

DEMO_PENNY = [
    {"symbol": "SNDL", "shares": 5000, "avg_cost": 0.38},
    {"symbol": "AMC", "shares": 800, "avg_cost": 4.20},
    {"symbol": "OPEN", "shares": 3000, "avg_cost": 1.85},
    {"symbol": "BNGO", "shares": 2500, "avg_cost": 1.10},
]

DEMO_BETS = [
    {"matchup": "Chiefs @ Bills", "pick": "Bills +4.5", "odds": "-110", "stake": 250, "sport": "football"},
    {"matchup": "Lakers @ Celtics", "pick": "Celtics -4", "odds": "-115", "stake": 100, "sport": "basketball"},
    {"matchup": "Dodgers @ Padres", "pick": "Padres +1.5", "odds": "+120", "stake": 75, "sport": "baseball"},
    {"matchup": "Yankees @ Red Sox", "pick": "Yankees -1.5", "odds": "-105", "stake": 50, "sport": "baseball"},
]

DEMO_PREDICTIONS = [
    {"market": "Ceasefire in Ukraine before Dec 2026?", "category": "geopolitics", "pick": "No", "stake": 200, "yes_price": 0.34},
    {"market": "Taylor Swift announces engagement in 2026?", "category": "entertainment", "pick": "Yes", "stake": 75, "yes_price": 0.41},
    {"market": "Fed cuts rates 3+ times in 2026?", "category": "economy", "pick": "Yes", "stake": 150, "yes_price": 0.55},
]


def seed_demo_user(user_id: str, force: bool = False) -> dict:
    """Seed sample portfolios and positions (does not unlock paid modules)."""
    now = datetime.now(timezone.utc).isoformat()
    seeded: list[str] = []

    if force or load_portfolio("stock_portfolios", user_id) is None:
        save_portfolio("stock_portfolios", user_id, DEMO_STOCKS, now)
        seeded.append("trades")

    if force or load_portfolio("crypto_portfolios", user_id) is None:
        save_portfolio("crypto_portfolios", user_id, DEMO_CRYPTO, now)
        seeded.append("crypto")

    if force or load_portfolio("penny_portfolios", user_id) is None:
        save_portfolio("penny_portfolios", user_id, DEMO_PENNY, now)
        seeded.append("penny")

    existing_bets = _bet_count(user_id)
    if force or existing_bets == 0:
        if force and existing_bets:
            _clear_bets(user_id)
        for b in DEMO_BETS:
            add_bet(user_id, b["matchup"], b["pick"], b["odds"], b["stake"], now, sport=b.get("sport", "other"))
        seeded.append("betting")

    existing_preds = _prediction_count(user_id)
    if force or existing_preds == 0:
        if force and existing_preds:
            _clear_predictions(user_id)
        for p in DEMO_PREDICTIONS:
            add_prediction(
                user_id, p["market"], p["category"], p["pick"], p["stake"], p["yes_price"], now
            )
        seeded.append("predictions")

    return {
        "seeded": seeded or ["already_exists"],
        "stocks": DEMO_STOCKS,
        "crypto": DEMO_CRYPTO,
        "penny": DEMO_PENNY,
        "bets": DEMO_BETS,
        "predictions": DEMO_PREDICTIONS,
        "modules_active": [],
    }


def _bet_count(user_id: str) -> int:
    from db import list_bets
    return len(list_bets(user_id))


def _clear_bets(user_id: str) -> None:
    from db import get_conn
    with get_conn() as conn:
        conn.execute("DELETE FROM bets WHERE user_id = ?", (user_id,))


def _prediction_count(user_id: str) -> int:
    from db import list_predictions
    return len(list_predictions(user_id))


def _clear_predictions(user_id: str) -> None:
    from db import get_conn
    with get_conn() as conn:
        conn.execute("DELETE FROM prediction_positions WHERE user_id = ?", (user_id,))
