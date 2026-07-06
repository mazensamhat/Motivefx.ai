"""Lightweight SQLite store for portfolios, bets, and module access."""

import json
import os
import sqlite3
from contextlib import contextmanager
from pathlib import Path

_DATA_DIR = Path(os.environ.get("MOTIVEFX_DATA_DIR", Path(__file__).parent))
DB_PATH = _DATA_DIR / "motivefx.db"


def init_db() -> None:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    with get_conn() as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS stock_portfolios (
                user_id TEXT PRIMARY KEY,
                holdings_json TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS crypto_portfolios (
                user_id TEXT PRIMARY KEY,
                holdings_json TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS penny_portfolios (
                user_id TEXT PRIMARY KEY,
                holdings_json TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS bets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                matchup TEXT NOT NULL,
                pick TEXT NOT NULL,
                odds TEXT,
                stake REAL,
                status TEXT DEFAULT 'open',
                created_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS module_subscriptions (
                user_id TEXT NOT NULL,
                module TEXT NOT NULL,
                active INTEGER DEFAULT 1,
                PRIMARY KEY (user_id, module)
            );
            CREATE TABLE IF NOT EXISTS prediction_positions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                market TEXT NOT NULL,
                category TEXT NOT NULL DEFAULT 'other',
                pick TEXT NOT NULL,
                stake REAL,
                yes_price REAL,
                created_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS user_platform_prefs (
                user_id TEXT NOT NULL,
                module TEXT NOT NULL,
                platform_id TEXT NOT NULL,
                custom_url TEXT,
                PRIMARY KEY (user_id, module)
            );
            CREATE TABLE IF NOT EXISTS users (
                user_id TEXT PRIMARY KEY,
                email TEXT,
                display_name TEXT,
                age INTEGER,
                sex TEXT,
                gender TEXT,
                cohort TEXT,
                country TEXT,
                region TEXT,
                city TEXT,
                payment_method TEXT,
                created_at TEXT NOT NULL,
                last_seen_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS subscription_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                module TEXT NOT NULL,
                event_type TEXT NOT NULL,
                plan_tier TEXT,
                payment_method TEXT,
                amount_usd REAL,
                created_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS usage_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT,
                module TEXT,
                action TEXT NOT NULL,
                endpoint TEXT,
                status_code INTEGER,
                duration_ms REAL,
                created_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS payment_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                amount_usd REAL NOT NULL,
                currency TEXT DEFAULT 'USD',
                payment_method TEXT,
                plan_tier TEXT,
                module TEXT,
                status TEXT NOT NULL,
                stripe_id TEXT,
                created_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS marketing_channels (
                id TEXT PRIMARY KEY,
                platform TEXT NOT NULL,
                handle TEXT,
                url TEXT,
                active INTEGER DEFAULT 1,
                created_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS channel_touchpoints (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                channel_id TEXT NOT NULL,
                event_type TEXT NOT NULL,
                amount_usd REAL DEFAULT 0,
                created_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS stripe_subscriptions (
                stripe_subscription_id TEXT PRIMARY KEY,
                stripe_customer_id TEXT,
                user_id TEXT NOT NULL,
                module TEXT NOT NULL,
                status TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS social_channel_credentials (
                channel_id TEXT PRIMARY KEY,
                account_id TEXT,
                access_token TEXT,
                refresh_token TEXT,
                extra_json TEXT,
                connection_status TEXT DEFAULT 'disconnected',
                last_sync_at TEXT,
                sync_error TEXT,
                updated_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS social_metrics_snapshots (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                channel_id TEXT NOT NULL,
                snapshot_date TEXT NOT NULL,
                followers INTEGER DEFAULT 0,
                impressions INTEGER DEFAULT 0,
                profile_views INTEGER DEFAULT 0,
                link_clicks INTEGER DEFAULT 0,
                engagement_rate REAL DEFAULT 0,
                posts_count INTEGER DEFAULT 0,
                raw_json TEXT,
                synced_at TEXT NOT NULL,
                UNIQUE(channel_id, snapshot_date)
            );
            """
        )
        _migrate(conn)


def _migrate(conn) -> None:
    bet_cols = {r[1] for r in conn.execute("PRAGMA table_info(bets)").fetchall()}
    if "sport" not in bet_cols:
        conn.execute("ALTER TABLE bets ADD COLUMN sport TEXT DEFAULT 'other'")

    sub_cols = {r[1] for r in conn.execute("PRAGMA table_info(module_subscriptions)").fetchall()}
    for col, ddl in (
        ("started_at", "ALTER TABLE module_subscriptions ADD COLUMN started_at TEXT"),
        ("cancelled_at", "ALTER TABLE module_subscriptions ADD COLUMN cancelled_at TEXT"),
        ("plan_tier", "ALTER TABLE module_subscriptions ADD COLUMN plan_tier TEXT"),
        ("payment_method", "ALTER TABLE module_subscriptions ADD COLUMN payment_method TEXT"),
    ):
        if col not in sub_cols:
            conn.execute(ddl)

    user_cols = {r[1] for r in conn.execute("PRAGMA table_info(users)").fetchall()}
    for col, ddl in (
        ("acquisition_channel", "ALTER TABLE users ADD COLUMN acquisition_channel TEXT"),
        ("stripe_customer_id", "ALTER TABLE users ADD COLUMN stripe_customer_id TEXT"),
        ("password_hash", "ALTER TABLE users ADD COLUMN password_hash TEXT"),
        ("totp_secret", "ALTER TABLE users ADD COLUMN totp_secret TEXT"),
        ("totp_enabled", "ALTER TABLE users ADD COLUMN totp_enabled INTEGER DEFAULT 0"),
        ("privacy_accepted_at", "ALTER TABLE users ADD COLUMN privacy_accepted_at TEXT"),
        ("terms_accepted_at", "ALTER TABLE users ADD COLUMN terms_accepted_at TEXT"),
        ("risk_acknowledged_at", "ALTER TABLE users ADD COLUMN risk_acknowledged_at TEXT"),
        ("marketing_consent", "ALTER TABLE users ADD COLUMN marketing_consent INTEGER DEFAULT 0"),
        ("sim_trial_started_at", "ALTER TABLE users ADD COLUMN sim_trial_started_at TEXT"),
        ("sim_bankroll", "ALTER TABLE users ADD COLUMN sim_bankroll REAL DEFAULT 1000"),
    ):
        if col not in user_cols:
            conn.execute(ddl)

    pred_cols = {r[1] for r in conn.execute("PRAGMA table_info(prediction_positions)").fetchall()}
    for col, ddl in (
        ("is_simulation", "ALTER TABLE prediction_positions ADD COLUMN is_simulation INTEGER DEFAULT 0"),
        ("outcome", "ALTER TABLE prediction_positions ADD COLUMN outcome TEXT"),
        ("pnl", "ALTER TABLE prediction_positions ADD COLUMN pnl REAL"),
        ("settled_at", "ALTER TABLE prediction_positions ADD COLUMN settled_at TEXT"),
        ("status", "ALTER TABLE prediction_positions ADD COLUMN status TEXT DEFAULT 'open'"),
    ):
        if col not in pred_cols:
            conn.execute(ddl)

    for col, ddl in (
        ("is_simulation", "ALTER TABLE bets ADD COLUMN is_simulation INTEGER DEFAULT 0"),
        ("outcome", "ALTER TABLE bets ADD COLUMN outcome TEXT"),
        ("pnl", "ALTER TABLE bets ADD COLUMN pnl REAL"),
        ("settled_at", "ALTER TABLE bets ADD COLUMN settled_at TEXT"),
    ):
        if col not in bet_cols:
            conn.execute(ddl)

    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS auth_refresh_tokens (
            token_hash TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            expires_at TEXT NOT NULL,
            created_at TEXT NOT NULL
        )
        """
    )

    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS password_reset_tokens (
            token_hash TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            expires_at TEXT NOT NULL,
            created_at TEXT NOT NULL
        )
        """
    )

    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS watchlist_items (
            user_id TEXT NOT NULL,
            module TEXT NOT NULL,
            symbol TEXT NOT NULL,
            created_at TEXT NOT NULL,
            PRIMARY KEY (user_id, module, symbol)
        )
        """
    )

    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS intel_journal (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            module TEXT,
            symbol TEXT,
            signal_title TEXT,
            note TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
        """
    )

    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS intel_alerts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            module TEXT,
            symbol TEXT,
            title TEXT NOT NULL,
            body TEXT,
            confidence INTEGER,
            alert_key TEXT NOT NULL,
            seen INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL,
            UNIQUE(user_id, alert_key)
        )
        """
    )

    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS user_intelligence_plans (
            user_id TEXT PRIMARY KEY,
            tier TEXT NOT NULL DEFAULT 'lite',
            selected_markets_json TEXT NOT NULL DEFAULT '[]',
            updated_at TEXT NOT NULL
        )
        """
    )

    _seed_default_channels(conn)


def _seed_default_channels(conn) -> None:
    from datetime import datetime, timezone

    now = datetime.now(timezone.utc).isoformat()
    defaults = [
        ("instagram", "Instagram", "@motivefx", "https://instagram.com/motivefx"),
        ("tiktok", "TikTok", "@motivefx", "https://tiktok.com/@motivefx"),
        ("facebook", "Facebook", "MotiveFX", "https://facebook.com/motivefx"),
        ("website", "Website", "motivefxai.com", "https://motivefxai.com"),
        ("youtube", "YouTube", "MotiveFX", "https://youtube.com/@motivefx"),
        ("x", "X / Twitter", "@motivefx", "https://x.com/motivefx"),
        ("referral", "Referral", "Word of mouth", None),
        ("other", "Other", "Unattributed", None),
    ]
    for cid, platform, handle, url in defaults:
        conn.execute(
            """
            INSERT OR IGNORE INTO marketing_channels (id, platform, handle, url, active, created_at)
            VALUES (?, ?, ?, ?, 1, ?)
            """,
            (cid, platform, handle, url, now),
        )


@contextmanager
def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def save_portfolio(table: str, user_id: str, holdings: list, updated_at: str) -> None:
    with get_conn() as conn:
        conn.execute(
            f"""
            INSERT INTO {table} (user_id, holdings_json, updated_at)
            VALUES (?, ?, ?)
            ON CONFLICT(user_id) DO UPDATE SET
                holdings_json = excluded.holdings_json,
                updated_at = excluded.updated_at
            """,
            (user_id, json.dumps(holdings), updated_at),
        )


def load_portfolio(table: str, user_id: str) -> list | None:
    with get_conn() as conn:
        row = conn.execute(
            f"SELECT holdings_json FROM {table} WHERE user_id = ?",
            (user_id,),
        ).fetchone()
    return json.loads(row["holdings_json"]) if row else None


def add_bet(
    user_id: str,
    matchup: str,
    pick: str,
    odds: str,
    stake: float,
    created_at: str,
    sport: str = "other",
    *,
    is_simulation: bool = False,
) -> int:
    with get_conn() as conn:
        cur = conn.execute(
            """
            INSERT INTO bets (user_id, matchup, pick, odds, stake, sport, created_at, is_simulation, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (user_id, matchup, pick, odds, stake, sport, created_at, 1 if is_simulation else 0, "open"),
        )
        return int(cur.lastrowid)


def list_bets(user_id: str) -> list[dict]:
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT * FROM bets WHERE user_id = ? ORDER BY id DESC LIMIT 50",
            (user_id,),
        ).fetchall()
    return [dict(r) for r in rows]


def list_bets_filtered(
    user_id: str,
    matchup: str | None = None,
    sport: str | None = None,
    status: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    min_stake: float | None = None,
    limit: int = 100,
) -> list[dict]:
    query = "SELECT * FROM bets WHERE user_id = ?"
    params: list = [user_id]
    if matchup:
        query += " AND LOWER(matchup) LIKE ?"
        params.append(f"%{matchup.lower()}%")
    if sport:
        query += " AND LOWER(sport) = ?"
        params.append(sport.lower())
    if status:
        query += " AND status = ?"
        params.append(status)
    if date_from:
        query += " AND created_at >= ?"
        params.append(date_from)
    if date_to:
        query += " AND created_at <= ?"
        params.append(date_to)
    if min_stake is not None:
        query += " AND stake >= ?"
        params.append(min_stake)
    query += " ORDER BY id DESC LIMIT ?"
    params.append(limit)
    with get_conn() as conn:
        rows = conn.execute(query, params).fetchall()
    return [dict(r) for r in rows]


def add_prediction(
    user_id: str,
    market: str,
    category: str,
    pick: str,
    stake: float,
    yes_price: float,
    created_at: str,
    *,
    is_simulation: bool = False,
) -> int:
    with get_conn() as conn:
        cur = conn.execute(
            """
            INSERT INTO prediction_positions
                (user_id, market, category, pick, stake, yes_price, created_at, is_simulation, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (user_id, market, category, pick, stake, yes_price, created_at, 1 if is_simulation else 0, "open"),
        )
        return int(cur.lastrowid)


def list_predictions(user_id: str, limit: int = 50) -> list[dict]:
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT * FROM prediction_positions WHERE user_id = ? ORDER BY id DESC LIMIT ?",
            (user_id, limit),
        ).fetchall()
    return [dict(r) for r in rows]


def get_user_sim_trial_started(user_id: str) -> str | None:
    with get_conn() as conn:
        row = conn.execute(
            "SELECT sim_trial_started_at FROM users WHERE user_id = ?",
            (user_id,),
        ).fetchone()
    if not row:
        return None
    return row["sim_trial_started_at"]


def set_user_sim_trial_started(user_id: str, started_at: str, bankroll: float) -> None:
    with get_conn() as conn:
        conn.execute(
            """
            UPDATE users SET sim_trial_started_at = ?, sim_bankroll = ?
            WHERE user_id = ?
            """,
            (started_at, bankroll, user_id),
        )


def get_sim_bankroll(user_id: str) -> float | None:
    with get_conn() as conn:
        row = conn.execute(
            "SELECT sim_bankroll FROM users WHERE user_id = ?",
            (user_id,),
        ).fetchone()
    if not row or row["sim_bankroll"] is None:
        return None
    return float(row["sim_bankroll"])


def update_sim_bankroll(user_id: str, delta: float) -> float:
    with get_conn() as conn:
        row = conn.execute(
            "SELECT sim_bankroll FROM users WHERE user_id = ?",
            (user_id,),
        ).fetchone()
        current = float(row["sim_bankroll"]) if row and row["sim_bankroll"] is not None else 1000.0
        new_balance = round(current + delta, 2)
        conn.execute(
            "UPDATE users SET sim_bankroll = ? WHERE user_id = ?",
            (new_balance, user_id),
        )
    return new_balance


def update_bet_settlement(bet_id: int, outcome: str, pnl: float, settled_at: str) -> None:
    with get_conn() as conn:
        conn.execute(
            """
            UPDATE bets SET outcome = ?, pnl = ?, settled_at = ?, status = 'settled'
            WHERE id = ?
            """,
            (outcome, pnl, settled_at, bet_id),
        )


def update_prediction_settlement(position_id: int, outcome: str, pnl: float, settled_at: str) -> None:
    with get_conn() as conn:
        conn.execute(
            """
            UPDATE prediction_positions SET outcome = ?, pnl = ?, settled_at = ?, status = 'settled'
            WHERE id = ?
            """,
            (outcome, pnl, settled_at, position_id),
        )


def list_predictions_filtered(
    user_id: str,
    category: str | None = None,
    market: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    min_stake: float | None = None,
    limit: int = 100,
) -> list[dict]:
    query = "SELECT * FROM prediction_positions WHERE user_id = ?"
    params: list = [user_id]
    if category:
        query += " AND category = ?"
        params.append(category)
    if market:
        query += " AND LOWER(market) LIKE ?"
        params.append(f"%{market.lower()}%")
    if date_from:
        query += " AND created_at >= ?"
        params.append(date_from)
    if date_to:
        query += " AND created_at <= ?"
        params.append(date_to)
    if min_stake is not None:
        query += " AND stake >= ?"
        params.append(min_stake)
    query += " ORDER BY id DESC LIMIT ?"
    params.append(limit)
    with get_conn() as conn:
        rows = conn.execute(query, params).fetchall()
    return [dict(r) for r in rows]


def set_module_access(
    user_id: str,
    module: str,
    active: bool = True,
    *,
    plan_tier: str | None = None,
    payment_method: str | None = None,
    amount_usd: float | None = None,
    sync_plan: bool = True,
) -> None:
    now = _utc_now()
    with get_conn() as conn:
        if active:
            conn.execute(
                """
                INSERT INTO module_subscriptions (user_id, module, active, started_at, plan_tier, payment_method)
                VALUES (?, ?, 1, ?, ?, ?)
                ON CONFLICT(user_id, module) DO UPDATE SET
                    active = 1,
                    started_at = COALESCE(module_subscriptions.started_at, excluded.started_at),
                    cancelled_at = NULL,
                    plan_tier = COALESCE(excluded.plan_tier, module_subscriptions.plan_tier),
                    payment_method = COALESCE(excluded.payment_method, module_subscriptions.payment_method)
                """,
                (user_id, module, now, plan_tier, payment_method),
            )
            _insert_subscription_event(conn, user_id, module, "activate", plan_tier, payment_method, amount_usd, now)
        else:
            conn.execute(
                """
                UPDATE module_subscriptions
                SET active = 0, cancelled_at = ?
                WHERE user_id = ? AND module = ?
                """,
                (now, user_id, module),
            )
            _insert_subscription_event(conn, user_id, module, "cancel", plan_tier, payment_method, amount_usd, now)
    if sync_plan:
        _sync_intelligence_plan_from_subscriptions(user_id)
    touch_user(user_id)


def _utc_now() -> str:
    from datetime import datetime, timezone

    return datetime.now(timezone.utc).isoformat()


def _insert_subscription_event(
    conn,
    user_id: str,
    module: str,
    event_type: str,
    plan_tier: str | None,
    payment_method: str | None,
    amount_usd: float | None,
    created_at: str,
) -> None:
    conn.execute(
        """
        INSERT INTO subscription_events (user_id, module, event_type, plan_tier, payment_method, amount_usd, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (user_id, module, event_type, plan_tier, payment_method, amount_usd, created_at),
    )


def upsert_user_profile(
    user_id: str,
    *,
    email: str | None = None,
    display_name: str | None = None,
    age: int | None = None,
    sex: str | None = None,
    gender: str | None = None,
    cohort: str | None = None,
    country: str | None = None,
    region: str | None = None,
    city: str | None = None,
    payment_method: str | None = None,
    acquisition_channel: str | None = None,
    stripe_customer_id: str | None = None,
) -> None:
    now = _utc_now()
    with get_conn() as conn:
        row = conn.execute("SELECT user_id FROM users WHERE user_id = ?", (user_id,)).fetchone()
        if row:
            fields = []
            params: list = []
            for key, val in (
                ("email", email),
                ("display_name", display_name),
                ("age", age),
                ("sex", sex),
                ("gender", gender),
                ("cohort", cohort),
                ("country", country),
                ("region", region),
                ("city", city),
                ("payment_method", payment_method),
                ("acquisition_channel", acquisition_channel),
                ("stripe_customer_id", stripe_customer_id),
            ):
                if val is not None:
                    fields.append(f"{key} = ?")
                    params.append(val)
            fields.append("last_seen_at = ?")
            params.append(now)
            params.append(user_id)
            conn.execute(f"UPDATE users SET {', '.join(fields)} WHERE user_id = ?", params)
        else:
            conn.execute(
                """
                INSERT INTO users (
                    user_id, email, display_name, age, sex, gender, cohort,
                    country, region, city, payment_method, acquisition_channel,
                    stripe_customer_id, created_at, last_seen_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    user_id,
                    email,
                    display_name,
                    age,
                    sex,
                    gender,
                    cohort,
                    country,
                    region,
                    city,
                    payment_method,
                    acquisition_channel,
                    stripe_customer_id,
                    now,
                    now,
                ),
            )
        if acquisition_channel:
            record_channel_touchpoint(user_id, acquisition_channel, "signup")


def touch_user(user_id: str) -> None:
    now = _utc_now()
    with get_conn() as conn:
        row = conn.execute("SELECT user_id FROM users WHERE user_id = ?", (user_id,)).fetchone()
        if row:
            conn.execute("UPDATE users SET last_seen_at = ? WHERE user_id = ?", (now, user_id))
        else:
            conn.execute(
                "INSERT INTO users (user_id, created_at, last_seen_at) VALUES (?, ?, ?)",
                (user_id, now, now),
            )


def record_usage_event(
    user_id: str | None,
    module: str | None,
    action: str,
    endpoint: str,
    status_code: int,
    duration_ms: float,
) -> None:
    with get_conn() as conn:
        conn.execute(
            """
            INSERT INTO usage_events (user_id, module, action, endpoint, status_code, duration_ms, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (user_id, module, action, endpoint, status_code, duration_ms, _utc_now()),
        )
    if user_id:
        touch_user(user_id)


def record_payment_event(
    user_id: str,
    amount_usd: float,
    *,
    currency: str = "USD",
    payment_method: str | None = None,
    plan_tier: str | None = None,
    module: str | None = None,
    status: str = "succeeded",
    stripe_id: str | None = None,
) -> None:
    with get_conn() as conn:
        conn.execute(
            """
            INSERT INTO payment_events (
                user_id, amount_usd, currency, payment_method, plan_tier, module, status, stripe_id, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                user_id,
                amount_usd,
                currency,
                payment_method,
                plan_tier,
                module,
                status,
                stripe_id,
                _utc_now(),
            ),
        )
    touch_user(user_id)
    channel = get_user_acquisition_channel(user_id)
    if channel and status == "succeeded":
        record_channel_touchpoint(user_id, channel, "payment", amount_usd)


def get_user_acquisition_channel(user_id: str) -> str | None:
    with get_conn() as conn:
        row = conn.execute(
            "SELECT acquisition_channel FROM users WHERE user_id = ?",
            (user_id,),
        ).fetchone()
    return row["acquisition_channel"] if row else None


def record_channel_touchpoint(
    user_id: str,
    channel_id: str,
    event_type: str,
    amount_usd: float = 0,
) -> None:
    with get_conn() as conn:
        conn.execute(
            """
            INSERT INTO channel_touchpoints (user_id, channel_id, event_type, amount_usd, created_at)
            VALUES (?, ?, ?, ?, ?)
            """,
            (user_id, channel_id, event_type, amount_usd, _utc_now()),
        )


def list_marketing_channels() -> list[dict]:
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT * FROM marketing_channels WHERE active = 1 ORDER BY platform ASC"
        ).fetchall()
    return [dict(r) for r in rows]


def upsert_stripe_subscription(
    stripe_subscription_id: str,
    user_id: str,
    module: str,
    status: str,
    stripe_customer_id: str | None = None,
) -> None:
    with get_conn() as conn:
        conn.execute(
            """
            INSERT INTO stripe_subscriptions (stripe_subscription_id, stripe_customer_id, user_id, module, status, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(stripe_subscription_id) DO UPDATE SET
                status = excluded.status,
                updated_at = excluded.updated_at,
                stripe_customer_id = COALESCE(excluded.stripe_customer_id, stripe_subscriptions.stripe_customer_id)
            """,
            (stripe_subscription_id, stripe_customer_id, user_id, module, status, _utc_now()),
        )
    if stripe_customer_id:
        upsert_user_profile(user_id, stripe_customer_id=stripe_customer_id)


def get_stripe_subscription(stripe_subscription_id: str) -> dict | None:
    with get_conn() as conn:
        row = conn.execute(
            "SELECT * FROM stripe_subscriptions WHERE stripe_subscription_id = ?",
            (stripe_subscription_id,),
        ).fetchone()
    return dict(row) if row else None


def deactivate_stripe_subscription(stripe_subscription_id: str) -> None:
    row = get_stripe_subscription(stripe_subscription_id)
    if not row:
        return
    user_id = row["user_id"]
    module = row["module"]
    from services.tier_billing import deactivate_tier_subscription

    if module in ("lite", "pro", "ultra", "ultra_plus", "elite"):
        deactivate_tier_subscription(user_id, module)
    elif module == "annual":
        to_deactivate = ("trades", "crypto", "betting", "penny", "predictions", "annual")
        plan_tier = "annual"
    elif module == "bundle":
        to_deactivate = ("trades", "crypto", "betting", "penny", "predictions")
        plan_tier = "bundle"
    else:
        to_deactivate = (module,)
        plan_tier = "monthly"
    for m in to_deactivate:
        set_module_access(user_id, m, False, plan_tier=plan_tier, payment_method="card", sync_plan=False)
    _sync_intelligence_plan_from_subscriptions(user_id)
    touch_user(user_id)
    upsert_stripe_subscription(stripe_subscription_id, user_id, module, "canceled", row["stripe_customer_id"])
    channel = get_user_acquisition_channel(user_id)
    if channel:
        record_channel_touchpoint(user_id, channel, "churn")


def list_all_users(limit: int = 500) -> list[dict]:
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT * FROM users ORDER BY last_seen_at DESC LIMIT ?",
            (limit,),
        ).fetchall()
    return [dict(r) for r in rows]


def get_subscription_rows(active_only: bool = False) -> list[dict]:
    query = "SELECT * FROM module_subscriptions"
    if active_only:
        query += " WHERE active = 1"
    with get_conn() as conn:
        rows = conn.execute(query).fetchall()
    return [dict(r) for r in rows]


def get_active_modules(user_id: str) -> list[str]:
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT module FROM module_subscriptions WHERE user_id = ? AND active = 1",
            (user_id,),
        ).fetchall()
    return [r["module"] for r in rows]


def get_active_market_modules_ordered(user_id: str) -> list[str]:
    """Paid intelligence markets, oldest subscription first (stable downgrade picks)."""
    from services.tier_entitlements import ALL_MARKET_MODULES

    with get_conn() as conn:
        rows = conn.execute(
            """
            SELECT module, started_at FROM module_subscriptions
            WHERE user_id = ? AND active = 1
            ORDER BY COALESCE(started_at, '') ASC, module ASC
            """,
            (user_id,),
        ).fetchall()
    return [r["module"] for r in rows if r["module"] in ALL_MARKET_MODULES]


def has_annual_plan(user_id: str) -> bool:
    return "annual" in get_active_modules(user_id)


def _sync_intelligence_plan_from_subscriptions(user_id: str) -> None:
    """Derive tier + selected markets from active module subscriptions."""
    _reconcile_user_plan(user_id, persist=True)


def _reconcile_selected_markets(
    tier: str,
    paid_ordered: list[str],
    stored_selected: list[str],
) -> list[str]:
    from services.tier_entitlements import (
        ALL_MARKET_MODULES,
        max_market_picks,
        tier_allows_all_markets,
    )

    if tier_allows_all_markets(tier):
        return list(ALL_MARKET_MODULES)

    cap = max_market_picks(tier)
    reconciled: list[str] = []
    for module in stored_selected:
        if module in paid_ordered and module not in reconciled:
            reconciled.append(module)
    for module in paid_ordered:
        if module not in reconciled:
            reconciled.append(module)
    return reconciled[:cap]


def _reconcile_user_plan(user_id: str, *, persist: bool = True) -> dict:
    """Subscriptions are the source of truth — never trust a stale stored tier."""
    from services.tier_entitlements import (
        FEATURE_MIN_TIER,
        infer_tier_from_modules,
        markets_allowed,
        tier_has_feature,
        features_for_tier,
    )

    paid = get_active_market_modules_ordered(user_id)
    annual = has_annual_plan(user_id)
    tier = infer_tier_from_modules(paid, annual)

    stored_selected: list[str] = []
    with get_conn() as conn:
        row = conn.execute(
            "SELECT selected_markets_json FROM user_intelligence_plans WHERE user_id = ?",
            (user_id,),
        ).fetchone()
    if row:
        try:
            stored_selected = json.loads(row["selected_markets_json"] or "[]")
        except json.JSONDecodeError:
            stored_selected = []

    selected = _reconcile_selected_markets(tier, paid, stored_selected)
    allowed = markets_allowed(tier, selected)
    features = {name: tier_has_feature(tier, name) for name in FEATURE_MIN_TIER}

    if persist:
        save_user_intelligence_plan(user_id, tier, selected, sync_from_subs=False)

    return {
        "tier": tier,
        "selectedMarkets": selected,
        "allowedMarkets": allowed,
        "features": features,
        "entitlements": features_for_tier(tier),
        "hasAnnual": annual,
        "paidMarketCount": len(paid),
    }


def save_user_intelligence_plan(
    user_id: str,
    tier: str,
    selected_markets: list[str],
    *,
    sync_from_subs: bool = True,
) -> None:
    from services.tier_entitlements import ALL_MARKET_MODULES, markets_allowed

    cleaned = [m for m in selected_markets if m in ALL_MARKET_MODULES]
    effective = markets_allowed(tier, cleaned)
    now = _utc_now()
    with get_conn() as conn:
        conn.execute(
            """
            INSERT INTO user_intelligence_plans (user_id, tier, selected_markets_json, updated_at)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(user_id) DO UPDATE SET
                tier = excluded.tier,
                selected_markets_json = excluded.selected_markets_json,
                updated_at = excluded.updated_at
            """,
            (user_id, tier, json.dumps(effective), now),
        )
    if sync_from_subs:
        touch_user(user_id)


def get_user_plan(user_id: str) -> dict:
    """Resolved intelligence tier, markets, and feature flags (always reconciled with subscriptions)."""
    return _reconcile_user_plan(user_id, persist=True)


def activate_annual_plan(user_id: str, payment_method: str | None = "card") -> None:
    """All modules + annual flag — maps to Elite intelligence tier."""
    for module in ("trades", "crypto", "betting", "penny", "predictions", "annual"):
        set_module_access(
            user_id,
            module,
            True,
            plan_tier="annual",
            payment_method=payment_method,
            sync_plan=False,
        )
    save_user_intelligence_plan(user_id, "elite", ["trades", "crypto", "betting", "penny", "predictions"])


def get_platform_prefs(user_id: str) -> dict[str, dict]:
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT module, platform_id, custom_url FROM user_platform_prefs WHERE user_id = ?",
            (user_id,),
        ).fetchall()
    return {
        r["module"]: {"platformId": r["platform_id"], "customUrl": r["custom_url"]}
        for r in rows
    }


def save_platform_prefs(user_id: str, prefs: dict[str, dict]) -> None:
    with get_conn() as conn:
        for module, entry in prefs.items():
            platform_id = entry.get("platformId") or entry.get("platform_id")
            if not platform_id:
                continue
            custom_url = entry.get("customUrl") or entry.get("custom_url")
            conn.execute(
                """
                INSERT INTO user_platform_prefs (user_id, module, platform_id, custom_url)
                VALUES (?, ?, ?, ?)
                ON CONFLICT(user_id, module) DO UPDATE SET
                    platform_id = excluded.platform_id,
                    custom_url = excluded.custom_url
                """,
                (user_id, module, platform_id, custom_url),
            )


def get_social_credentials(channel_id: str) -> dict | None:
    with get_conn() as conn:
        row = conn.execute(
            "SELECT * FROM social_channel_credentials WHERE channel_id = ?",
            (channel_id,),
        ).fetchone()
    return dict(row) if row else None


def list_social_credentials() -> list[dict]:
    with get_conn() as conn:
        rows = conn.execute("SELECT * FROM social_channel_credentials ORDER BY channel_id").fetchall()
    return [dict(r) for r in rows]


def save_social_credentials(
    channel_id: str,
    *,
    account_id: str | None = None,
    access_token: str | None = None,
    refresh_token: str | None = None,
    extra_json: str | None = None,
    connection_status: str = "configured",
) -> None:
    now = _utc_now()
    existing = get_social_credentials(channel_id)
    with get_conn() as conn:
        if existing:
            fields = ["updated_at = ?", "connection_status = ?"]
            params: list = [now, connection_status]
            if account_id is not None:
                fields.append("account_id = ?")
                params.append(account_id)
            if access_token is not None:
                fields.append("access_token = ?")
                params.append(access_token)
            if refresh_token is not None:
                fields.append("refresh_token = ?")
                params.append(refresh_token)
            if extra_json is not None:
                fields.append("extra_json = ?")
                params.append(extra_json)
            params.append(channel_id)
            conn.execute(
                f"UPDATE social_channel_credentials SET {', '.join(fields)} WHERE channel_id = ?",
                params,
            )
        else:
            conn.execute(
                """
                INSERT INTO social_channel_credentials (
                    channel_id, account_id, access_token, refresh_token, extra_json,
                    connection_status, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (channel_id, account_id, access_token, refresh_token, extra_json, connection_status, now),
            )


def update_social_sync_status(
    channel_id: str,
    *,
    status: str,
    sync_error: str | None = None,
) -> None:
    now = _utc_now()
    with get_conn() as conn:
        conn.execute(
            """
            UPDATE social_channel_credentials
            SET connection_status = ?, last_sync_at = ?, sync_error = ?, updated_at = ?
            WHERE channel_id = ?
            """,
            (status, now if status == "connected" else None, sync_error, now, channel_id),
        )


def save_social_metrics_snapshot(
    channel_id: str,
    snapshot_date: str,
    *,
    followers: int = 0,
    impressions: int = 0,
    profile_views: int = 0,
    link_clicks: int = 0,
    engagement_rate: float = 0,
    posts_count: int = 0,
    raw_json: str | None = None,
) -> None:
    now = _utc_now()
    with get_conn() as conn:
        conn.execute(
            """
            INSERT INTO social_metrics_snapshots (
                channel_id, snapshot_date, followers, impressions, profile_views,
                link_clicks, engagement_rate, posts_count, raw_json, synced_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(channel_id, snapshot_date) DO UPDATE SET
                followers = excluded.followers,
                impressions = excluded.impressions,
                profile_views = excluded.profile_views,
                link_clicks = excluded.link_clicks,
                engagement_rate = excluded.engagement_rate,
                posts_count = excluded.posts_count,
                raw_json = excluded.raw_json,
                synced_at = excluded.synced_at
            """,
            (
                channel_id,
                snapshot_date,
                followers,
                impressions,
                profile_views,
                link_clicks,
                engagement_rate,
                posts_count,
                raw_json,
                now,
            ),
        )


def get_latest_social_metrics(channel_id: str) -> dict | None:
    with get_conn() as conn:
        row = conn.execute(
            """
            SELECT * FROM social_metrics_snapshots
            WHERE channel_id = ?
            ORDER BY snapshot_date DESC
            LIMIT 1
            """,
            (channel_id,),
        ).fetchone()
    return dict(row) if row else None


def get_social_metrics_history(channel_id: str, days: int = 30) -> list[dict]:
    since = _utc_now()[:10]  # rough; use date comparison
    with get_conn() as conn:
        rows = conn.execute(
            """
            SELECT * FROM social_metrics_snapshots
            WHERE channel_id = ?
            ORDER BY snapshot_date DESC
            LIMIT ?
            """,
            (channel_id, days),
        ).fetchall()
    return [dict(r) for r in rows]


def record_channel_visit(channel_id: str, user_id: str | None = None) -> None:
    uid = user_id or "anonymous"
    record_channel_touchpoint(uid, channel_id, "visit")


# ── Auth ─────────────────────────────────────────────────────────────────────


def get_user_by_email(email: str) -> dict | None:
    with get_conn() as conn:
        row = conn.execute(
            "SELECT * FROM users WHERE lower(email) = lower(?)",
            (email.strip(),),
        ).fetchone()
    return dict(row) if row else None


def get_user_record(user_id: str) -> dict | None:
    with get_conn() as conn:
        row = conn.execute("SELECT * FROM users WHERE user_id = ?", (user_id,)).fetchone()
    return dict(row) if row else None


def create_auth_user(
    user_id: str,
    email: str,
    password_hash: str,
    *,
    display_name: str | None = None,
    privacy_accepted_at: str | None = None,
    terms_accepted_at: str | None = None,
    risk_acknowledged_at: str | None = None,
    marketing_consent: bool = False,
    acquisition_channel: str | None = None,
) -> None:
    now = _utc_now()
    with get_conn() as conn:
        conn.execute(
            """
            INSERT INTO users (
                user_id, email, display_name, password_hash, privacy_accepted_at,
                terms_accepted_at, risk_acknowledged_at, marketing_consent, acquisition_channel,
                created_at, last_seen_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                user_id,
                email.strip().lower(),
                display_name,
                password_hash,
                privacy_accepted_at,
                terms_accepted_at,
                risk_acknowledged_at,
                1 if marketing_consent else 0,
                acquisition_channel,
                now,
                now,
            ),
        )
    if acquisition_channel:
        record_channel_touchpoint(user_id, acquisition_channel, "signup")


def update_auth_credentials(
    user_id: str,
    *,
    password_hash: str | None = None,
    totp_secret: str | None = None,
    totp_enabled: bool | None = None,
) -> None:
    fields: list[str] = []
    params: list = []
    if password_hash is not None:
        fields.append("password_hash = ?")
        params.append(password_hash)
    if totp_secret is not None:
        fields.append("totp_secret = ?")
        params.append(totp_secret)
    if totp_enabled is not None:
        fields.append("totp_enabled = ?")
        params.append(1 if totp_enabled else 0)
    if not fields:
        return
    fields.append("last_seen_at = ?")
    params.append(_utc_now())
    params.append(user_id)
    with get_conn() as conn:
        conn.execute(f"UPDATE users SET {', '.join(fields)} WHERE user_id = ?", params)


def store_refresh_token(token_hash: str, user_id: str, expires_at: str) -> None:
    with get_conn() as conn:
        conn.execute(
            """
            INSERT INTO auth_refresh_tokens (token_hash, user_id, expires_at, created_at)
            VALUES (?, ?, ?, ?)
            """,
            (token_hash, user_id, expires_at, _utc_now()),
        )


def get_refresh_token(token_hash: str) -> dict | None:
    with get_conn() as conn:
        row = conn.execute(
            "SELECT * FROM auth_refresh_tokens WHERE token_hash = ?",
            (token_hash,),
        ).fetchone()
    return dict(row) if row else None


def revoke_refresh_token(token_hash: str) -> None:
    with get_conn() as conn:
        conn.execute("DELETE FROM auth_refresh_tokens WHERE token_hash = ?", (token_hash,))


def revoke_all_refresh_tokens(user_id: str) -> None:
    with get_conn() as conn:
        conn.execute("DELETE FROM auth_refresh_tokens WHERE user_id = ?", (user_id,))


def merge_user_accounts(from_id: str, to_id: str) -> None:
    """Move anonymous session data onto an authenticated account."""
    if not from_id or from_id == to_id:
        return
    with get_conn() as conn:
        for table in (
            "bets",
            "prediction_positions",
            "subscription_events",
            "usage_events",
            "payment_events",
            "channel_touchpoints",
            "stripe_subscriptions",
        ):
            conn.execute(f"UPDATE {table} SET user_id = ? WHERE user_id = ?", (to_id, from_id))

        for table in ("stock_portfolios", "crypto_portfolios", "penny_portfolios"):
            src = conn.execute(
                f"SELECT holdings_json, updated_at FROM {table} WHERE user_id = ?",
                (from_id,),
            ).fetchone()
            if not src:
                continue
            dst = conn.execute(
                f"SELECT user_id FROM {table} WHERE user_id = ?",
                (to_id,),
            ).fetchone()
            if dst:
                conn.execute(f"DELETE FROM {table} WHERE user_id = ?", (from_id,))
            else:
                conn.execute(
                    f"UPDATE {table} SET user_id = ? WHERE user_id = ?",
                    (to_id, from_id),
                )

        conn.execute(
            "UPDATE watchlist_items SET user_id = ? WHERE user_id = ?",
            (to_id, from_id),
        )
        conn.execute(
            "UPDATE intel_journal SET user_id = ? WHERE user_id = ?",
            (to_id, from_id),
        )
        conn.execute(
            "UPDATE intel_alerts SET user_id = ? WHERE user_id = ?",
            (to_id, from_id),
        )

        subs = conn.execute(
            "SELECT module, active, plan_tier, payment_method FROM module_subscriptions WHERE user_id = ?",
            (from_id,),
        ).fetchall()
        for sub in subs:
            if sub["active"]:
                set_module_access(
                    to_id,
                    sub["module"],
                    True,
                    plan_tier=sub["plan_tier"],
                    payment_method=sub["payment_method"],
                )
        conn.execute("DELETE FROM module_subscriptions WHERE user_id = ?", (from_id,))

        prefs = conn.execute(
            "SELECT module, platform_id, custom_url FROM user_platform_prefs WHERE user_id = ?",
            (from_id,),
        ).fetchall()
        for pref in prefs:
            existing = conn.execute(
                "SELECT 1 FROM user_platform_prefs WHERE user_id = ? AND module = ?",
                (to_id, pref["module"]),
            ).fetchone()
            if not existing:
                conn.execute(
                    """
                    INSERT INTO user_platform_prefs (user_id, module, platform_id, custom_url)
                    VALUES (?, ?, ?, ?)
                    """,
                    (to_id, pref["module"], pref["platform_id"], pref["custom_url"]),
                )
        conn.execute("DELETE FROM user_platform_prefs WHERE user_id = ?", (from_id,))

        src_user = conn.execute("SELECT * FROM users WHERE user_id = ?", (from_id,)).fetchone()
        if src_user:
            dst_user = conn.execute("SELECT * FROM users WHERE user_id = ?", (to_id,)).fetchone()
            if dst_user:
                updates = []
                params: list = []
                for field in ("cohort", "sex", "gender", "age", "acquisition_channel", "country", "region", "city"):
                    if src_user[field] and not dst_user[field]:
                        updates.append(f"{field} = ?")
                        params.append(src_user[field])
                if updates:
                    params.append(to_id)
                    conn.execute(f"UPDATE users SET {', '.join(updates)} WHERE user_id = ?", params)
            conn.execute("DELETE FROM users WHERE user_id = ?", (from_id,))


def store_password_reset_token(token_hash: str, user_id: str, expires_at: str) -> None:
    with get_conn() as conn:
        conn.execute("DELETE FROM password_reset_tokens WHERE user_id = ?", (user_id,))
        conn.execute(
            """
            INSERT INTO password_reset_tokens (token_hash, user_id, expires_at, created_at)
            VALUES (?, ?, ?, ?)
            """,
            (token_hash, user_id, expires_at, _utc_now()),
        )


def get_password_reset_token(token_hash: str) -> dict | None:
    with get_conn() as conn:
        row = conn.execute(
            "SELECT * FROM password_reset_tokens WHERE token_hash = ?",
            (token_hash,),
        ).fetchone()
    return dict(row) if row else None


def delete_password_reset_token(token_hash: str) -> None:
    with get_conn() as conn:
        conn.execute("DELETE FROM password_reset_tokens WHERE token_hash = ?", (token_hash,))


def export_user_data(user_id: str) -> dict:
    user = get_user_record(user_id)
    if not user:
        return {}
    safe_user = {k: v for k, v in user.items() if k not in ("password_hash", "totp_secret")}
    return {
        "user": safe_user,
        "modules": get_active_modules(user_id),
        "stockPortfolio": load_portfolio("stock_portfolios", user_id) or [],
        "cryptoPortfolio": load_portfolio("crypto_portfolios", user_id) or [],
        "pennyPortfolio": load_portfolio("penny_portfolios", user_id) or [],
        "bets": list_bets(user_id),
        "predictions": list_predictions(user_id),
        "platformPrefs": get_platform_prefs(user_id),
        "watchlist": list_watchlist(user_id),
        "intelJournal": list_intel_journal(user_id),
        "intelAlerts": list_intel_alerts(user_id),
    }


def list_watchlist(user_id: str) -> list[dict]:
    with get_conn() as conn:
        rows = conn.execute(
            """
            SELECT module, symbol, created_at FROM watchlist_items
            WHERE user_id = ?
            ORDER BY created_at DESC
            """,
            (user_id,),
        ).fetchall()
    return [{"module": r["module"], "symbol": r["symbol"], "createdAt": r["created_at"]} for r in rows]


def add_watchlist_item(user_id: str, module: str, symbol: str, created_at: str) -> None:
    sym = symbol.upper().strip().lstrip("$")
    with get_conn() as conn:
        conn.execute(
            """
            INSERT INTO watchlist_items (user_id, module, symbol, created_at)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(user_id, module, symbol) DO NOTHING
            """,
            (user_id, module, sym, created_at),
        )


def remove_watchlist_item(user_id: str, module: str, symbol: str) -> None:
    sym = symbol.upper().strip().lstrip("$")
    with get_conn() as conn:
        conn.execute(
            "DELETE FROM watchlist_items WHERE user_id = ? AND module = ? AND symbol = ?",
            (user_id, module, sym),
        )


def count_user_holdings(user_id: str) -> dict:
    """Count ledger positions across portfolio tables."""
    counts = {
        "trades": len(load_portfolio("stock_portfolios", user_id) or []),
        "crypto": len(load_portfolio("crypto_portfolios", user_id) or []),
        "penny": len(load_portfolio("penny_portfolios", user_id) or []),
        "total": 0,
    }
    counts["total"] = counts["trades"] + counts["crypto"] + counts["penny"]
    return counts


def user_tracked_symbols(user_id: str) -> set[str]:
    """Symbols from watchlist + all portfolio ledgers."""
    symbols: set[str] = set()
    for row in list_watchlist(user_id):
        symbols.add(row["symbol"].upper())
    for table in ("stock_portfolios", "crypto_portfolios", "penny_portfolios"):
        for h in load_portfolio(table, user_id) or []:
            sym = (h.get("symbol") or "").upper()
            if sym:
                symbols.add(sym)
    return symbols


def list_intel_journal(user_id: str, limit: int = 50) -> list[dict]:
    with get_conn() as conn:
        rows = conn.execute(
            """
            SELECT id, module, symbol, signal_title, note, created_at, updated_at
            FROM intel_journal WHERE user_id = ?
            ORDER BY updated_at DESC LIMIT ?
            """,
            (user_id, limit),
        ).fetchall()
    return [
        {
            "id": r["id"],
            "module": r["module"],
            "symbol": r["symbol"],
            "signalTitle": r["signal_title"],
            "note": r["note"],
            "createdAt": r["created_at"],
            "updatedAt": r["updated_at"],
        }
        for r in rows
    ]


def add_intel_journal_entry(
    user_id: str,
    note: str,
    *,
    module: str | None = None,
    symbol: str | None = None,
    signal_title: str | None = None,
    now: str,
) -> int:
    sym = symbol.upper().strip().lstrip("$") if symbol else None
    with get_conn() as conn:
        cur = conn.execute(
            """
            INSERT INTO intel_journal (user_id, module, symbol, signal_title, note, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (user_id, module, sym, signal_title, note.strip(), now, now),
        )
        return int(cur.lastrowid)


def delete_intel_journal_entry(user_id: str, entry_id: int) -> bool:
    with get_conn() as conn:
        cur = conn.execute(
            "DELETE FROM intel_journal WHERE user_id = ? AND id = ?",
            (user_id, entry_id),
        )
        return cur.rowcount > 0


def upsert_intel_alerts(user_id: str, alerts: list[dict], now: str) -> None:
    """Insert or refresh radar-style alerts; preserve seen state on existing keys."""
    with get_conn() as conn:
        for a in alerts:
            conn.execute(
                """
                INSERT INTO intel_alerts
                    (user_id, module, symbol, title, body, confidence, alert_key, seen, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)
                ON CONFLICT(user_id, alert_key) DO UPDATE SET
                    title = excluded.title,
                    body = excluded.body,
                    confidence = excluded.confidence,
                    created_at = excluded.created_at
                """,
                (
                    user_id,
                    a.get("module"),
                    a.get("symbol"),
                    a["title"],
                    a.get("body"),
                    a.get("confidence"),
                    a["alertKey"],
                    now,
                ),
            )


def list_intel_alerts(user_id: str, limit: int = 40) -> list[dict]:
    with get_conn() as conn:
        rows = conn.execute(
            """
            SELECT id, module, symbol, title, body, confidence, seen, created_at
            FROM intel_alerts WHERE user_id = ?
            ORDER BY seen ASC, created_at DESC LIMIT ?
            """,
            (user_id, limit),
        ).fetchall()
    return [
        {
            "id": r["id"],
            "module": r["module"],
            "symbol": r["symbol"],
            "title": r["title"],
            "body": r["body"],
            "confidence": r["confidence"],
            "seen": bool(r["seen"]),
            "createdAt": r["created_at"],
        }
        for r in rows
    ]


def count_unseen_intel_alerts(user_id: str) -> int:
    with get_conn() as conn:
        row = conn.execute(
            "SELECT COUNT(*) AS c FROM intel_alerts WHERE user_id = ? AND seen = 0",
            (user_id,),
        ).fetchone()
    return int(row["c"]) if row else 0


def mark_intel_alert_seen(user_id: str, alert_id: int) -> bool:
    with get_conn() as conn:
        cur = conn.execute(
            "UPDATE intel_alerts SET seen = 1 WHERE user_id = ? AND id = ?",
            (user_id, alert_id),
        )
        return cur.rowcount > 0


def mark_all_intel_alerts_seen(user_id: str) -> None:
    with get_conn() as conn:
        conn.execute(
            "UPDATE intel_alerts SET seen = 1 WHERE user_id = ? AND seen = 0",
            (user_id,),
        )


def delete_user_account(user_id: str) -> None:
    with get_conn() as conn:
        for table in (
            "auth_refresh_tokens",
            "password_reset_tokens",
            "stock_portfolios",
            "crypto_portfolios",
            "penny_portfolios",
            "bets",
            "prediction_positions",
            "user_platform_prefs",
            "module_subscriptions",
            "subscription_events",
            "usage_events",
            "payment_events",
            "channel_touchpoints",
            "stripe_subscriptions",
            "watchlist_items",
            "intel_journal",
            "intel_alerts",
        ):
            if table == "auth_refresh_tokens":
                conn.execute(f"DELETE FROM {table} WHERE user_id = ?", (user_id,))
            else:
                try:
                    conn.execute(f"DELETE FROM {table} WHERE user_id = ?", (user_id,))
                except Exception:
                    pass
        conn.execute("DELETE FROM users WHERE user_id = ?", (user_id,))
