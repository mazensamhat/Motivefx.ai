"""Three-day simulation sandbox for betting & predictions (pre-subscription hook)."""

from __future__ import annotations

import hashlib
import re
from datetime import datetime, timedelta, timezone

from db import (
    get_conn,
    get_sim_bankroll,
    get_user_sim_trial_started,
    set_user_sim_trial_started,
    update_bet_settlement,
    update_prediction_settlement,
    update_sim_bankroll,
)

SIMULATION_MODULES = ("betting", "predictions")
SIMULATION_DAYS = 3
START_BANKROLL = 1000.0
# Slight positive bias so early sim sessions feel rewarding (conversion hook).
SIM_EDGE_BOOST = 0.08


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def start_sim_trial(user_id: str) -> dict:
    """Begin the 3-day simulation window with virtual bankroll."""
    if get_user_sim_trial_started(user_id):
        return get_simulation_status(user_id)
    now = _utc_now()
    set_user_sim_trial_started(user_id, now.isoformat(), START_BANKROLL)
    return get_simulation_status(user_id)


def ensure_sim_trial(user_id: str) -> dict:
    """Lazy-start simulation for accounts created before this feature."""
    if not get_user_sim_trial_started(user_id):
        start_sim_trial(user_id)
    return get_simulation_status(user_id)


def get_simulation_status(user_id: str) -> dict:
    started = get_user_sim_trial_started(user_id)
    bankroll = get_sim_bankroll(user_id) or START_BANKROLL
    if not started:
        return {
            "active": False,
            "expiresAt": None,
            "bankroll": bankroll,
            "modules": [],
            "daysRemaining": 0,
        }
    started_dt = datetime.fromisoformat(started.replace("Z", "+00:00"))
    expires = started_dt + timedelta(days=SIMULATION_DAYS)
    now = _utc_now()
    active = now < expires
    remaining = max(0, (expires - now).total_seconds() / 86400)
    return {
        "active": active,
        "expiresAt": expires.isoformat(),
        "startedAt": started,
        "bankroll": round(bankroll, 2),
        "modules": list(SIMULATION_MODULES) if active else [],
        "daysRemaining": round(remaining, 1),
    }


def sim_has_module(user_id: str, module: str) -> bool:
    if module not in SIMULATION_MODULES:
        return False
    status = get_simulation_status(user_id)
    return bool(status["active"])


def _deterministic_roll(seed: str) -> float:
    digest = hashlib.sha256(seed.encode()).hexdigest()
    return int(digest[:8], 16) / 0xFFFFFFFF


def _parse_american_odds(odds: str) -> int | None:
    cleaned = re.sub(r"[^\d+\-]", "", (odds or "").strip())
    if not cleaned or cleaned in ("+", "-"):
        return None
    try:
        return int(cleaned)
    except ValueError:
        return None


def _implied_win_prob(odds: str) -> float:
    parsed = _parse_american_odds(odds)
    if parsed is None:
        return 0.52
    if parsed > 0:
        return 100 / (parsed + 100)
    return abs(parsed) / (abs(parsed) + 100)


def _bet_profit(stake: float, odds: str, won: bool) -> float:
    if not won:
        return -stake
    parsed = _parse_american_odds(odds)
    if parsed is None:
        return stake * 0.91
    if parsed > 0:
        return stake * parsed / 100
    return stake * 100 / abs(parsed)


def settle_simulation_bet(
    bet_id: int,
    user_id: str,
    matchup: str,
    pick: str,
    odds: str,
    stake: float,
) -> dict:
    stake = float(stake or 0) or 25.0
    roll = _deterministic_roll(f"bet:{bet_id}:{user_id}:{matchup}:{pick}")
    win_prob = min(0.92, _implied_win_prob(odds) + SIM_EDGE_BOOST)
    won = roll < win_prob
    pnl = round(_bet_profit(stake, odds, won), 2)
    outcome = "won" if won else "lost"
    settled_at = _utc_now().isoformat()
    update_bet_settlement(bet_id, outcome, pnl, settled_at)
    update_sim_bankroll(user_id, pnl)
    return {
        "outcome": outcome,
        "pnl": pnl,
        "won": won,
        "settledAt": settled_at,
        "bankroll": round(get_sim_bankroll(user_id) or START_BANKROLL, 2),
    }


def settle_simulation_prediction(
    position_id: int,
    user_id: str,
    market: str,
    pick: str,
    stake: float,
    yes_price: float,
) -> dict:
    stake = float(stake or 0) or 25.0
    yes_price = float(yes_price or 0.5)
    yes_price = max(0.05, min(0.95, yes_price))
    roll = _deterministic_roll(f"pred:{position_id}:{user_id}:{market}:{pick}")
    if pick.lower() == "yes":
        win_prob = min(0.92, yes_price + SIM_EDGE_BOOST)
        won = roll < win_prob
        pnl = round(stake * (1 - yes_price) / yes_price, 2) if won else round(-stake, 2)
    else:
        no_price = 1 - yes_price
        win_prob = min(0.92, no_price + SIM_EDGE_BOOST)
        won = roll < win_prob
        pnl = round(stake * yes_price / no_price, 2) if won else round(-stake, 2)
    outcome = "won" if won else "lost"
    settled_at = _utc_now().isoformat()
    update_prediction_settlement(position_id, outcome, pnl, settled_at)
    update_sim_bankroll(user_id, pnl)
    return {
        "outcome": outcome,
        "pnl": pnl,
        "won": won,
        "settledAt": settled_at,
        "bankroll": round(get_sim_bankroll(user_id) or START_BANKROLL, 2),
    }
