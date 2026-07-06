from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from config import settings
from db import (
    activate_annual_plan,
    add_bet,
    add_prediction,
    get_active_modules,
    get_platform_prefs,
    get_user_plan,
    get_user_record,
    has_annual_plan,
    list_bets,
    list_predictions,
    load_portfolio,
    record_payment_event,
    save_platform_prefs,
    save_portfolio,
    set_module_access,
    upsert_user_profile,
)
from deps.access import allow_profile_or_anonymous, ensure_user_match, get_current_user_strict
from deps.auth import get_optional_user
from deps.modules import has_paid_module, require_module
from deps.tiers import require_feature
from models.schemas import AdvisorResponse, BetEntry, PortfolioRequest, PredictionEntry
from services import advisor, deep_scan, llm, news_feed
from services.billing_attribution import persist_acquisition, stripe_checkout_metadata
from services.simulation import settle_simulation_bet, settle_simulation_prediction, sim_has_module

router = APIRouter(prefix="/api/advisor", tags=["advisor"])

MODULES = {
    "trades": {
        "name": "Trades",
        "tagline": "Holdings intel + unusual options + congress flow",
        "price": 29,
        "features": ["Holdings signal context", "Unusual options scanner", "Congress & insider signals"],
    },
    "crypto": {
        "name": "Crypto",
        "tagline": "Wallet intelligence + prediction markets + holdings intel",
        "price": 29,
        "features": ["Crypto holdings tracker", "Whale & trending alerts", "Polymarket odds feed"],
    },
    "betting": {
        "name": "Betting",
        "tagline": "Line moves + sharp money + bet grader",
        "price": 29,
        "features": ["Track your bets", "AI signal research", "Sharp vs public splits"],
    },
    "penny": {
        "name": "Pink Slips",
        "tagline": "Penny stock scanner + pink slip holdings intel",
        "price": 29,
        "features": ["Sub-$5 signal scanner", "Informational signal context on pink slips", "Volume spike alerts"],
    },
    "predictions": {
        "name": "Predictions",
        "tagline": "War, politics, celebrity & event markets (Polymarket-style)",
        "price": 29,
        "features": ["Geopolitics & war markets", "Celebrity / marriage bets", "AI odds analysis"],
    },
}


class ModuleCheckoutRequest(BaseModel):
    module: str
    success_url: str
    cancel_url: str
    user_id: str = "demo"
    acquisition_channel: str | None = None


class TierCheckoutRequest(BaseModel):
    tier: str
    selected_markets: list[str] = []
    success_url: str | None = None
    cancel_url: str | None = None
    user_id: str = "demo"
    acquisition_channel: str | None = None


class DemoSetupRequest(BaseModel):
    user_id: str = "demo"
    force: bool = False


class PlatformPrefEntry(BaseModel):
    platformId: str
    customUrl: str | None = None


class PlatformPrefsSaveRequest(BaseModel):
    user_id: str = "demo"
    prefs: dict[str, PlatformPrefEntry]


class UserProfileRequest(BaseModel):
    user_id: str
    email: str | None = None
    display_name: str | None = None
    age: int | None = None
    sex: str | None = None
    gender: str | None = None
    cohort: str | None = None
    country: str | None = None
    region: str | None = None
    city: str | None = None
    payment_method: str | None = None
    acquisition_channel: str | None = None


@router.post("/profile")
async def save_user_profile(body: UserProfileRequest, user: dict | None = Depends(get_optional_user)):
    allow_profile_or_anonymous(body.user_id, user)
    upsert_user_profile(
        body.user_id,
        email=body.email,
        display_name=body.display_name,
        age=body.age,
        sex=body.sex,
        gender=body.gender,
        cohort=body.cohort,
        country=body.country,
        region=body.region,
        city=body.city,
        payment_method=body.payment_method,
        acquisition_channel=body.acquisition_channel,
    )
    return {"ok": True, "userId": body.user_id}


class AcquisitionSyncRequest(BaseModel):
    user_id: str
    acquisition_channel: str


@router.post("/profile/acquisition")
async def sync_acquisition_channel(body: AcquisitionSyncRequest, user: dict | None = Depends(get_optional_user)):
    allow_profile_or_anonymous(body.user_id, user)
    channel = persist_acquisition(body.user_id, body.acquisition_channel)
    return {"ok": True, "channel": channel}


class PlatformDeeplinkRequest(BaseModel):
    user_id: str = "demo"
    module: str
    side: str = "BUY"
    symbol: str = ""
    query: str = ""


@router.get("/platform-catalog")
async def platform_catalog():
    from services.trading_platforms import catalog_for_api
    return catalog_for_api()


@router.get("/platform-prefs/{user_id}")
async def platform_prefs(user_id: str, user: dict = Depends(get_current_user_strict)):
    ensure_user_match(user, user_id)
    from services.trading_platforms import catalog_for_api
    return {**catalog_for_api(), "prefs": get_platform_prefs(user_id)}


@router.post("/platform-prefs")
async def save_platform_prefs_route(body: PlatformPrefsSaveRequest, user: dict = Depends(get_current_user_strict)):
    ensure_user_match(user, body.user_id)
    prefs_dict = {
        k: {"platformId": v.platformId, "customUrl": v.customUrl}
        for k, v in body.prefs.items()
    }
    save_platform_prefs(body.user_id, prefs_dict)
    return {"saved": True, "prefs": get_platform_prefs(body.user_id)}


@router.post("/platform-deeplink")
async def platform_deeplink(body: PlatformDeeplinkRequest, user: dict = Depends(get_current_user_strict)):
    ensure_user_match(user, body.user_id)
    from services.trading_platforms import build_deeplink, find_platform

    prefs = get_platform_prefs(body.user_id)
    entry = prefs.get(body.module)
    if not entry or not entry.get("platformId"):
        raise HTTPException(
            400,
            detail="No app or broker configured for this module. Complete platform setup first.",
        )
    platform_id = entry["platformId"]
    custom_url = entry.get("customUrl")
    platform = find_platform(body.module, platform_id)
    url = build_deeplink(
        body.module,
        platform_id,
        symbol=body.symbol,
        query=body.query,
        side=body.side,
        custom_url=custom_url,
    )
    if not url:
        raise HTTPException(400, detail="Could not build a link for the selected platform.")
    name = platform["name"] if platform else "Custom app"
    return {"url": url, "platformId": platform_id, "platformName": name}


@router.post("/demo/setup")
async def setup_demo(body: DemoSetupRequest, user: dict = Depends(get_current_user_strict)):
    ensure_user_match(user, body.user_id)
    from services.demo_data import seed_demo_user
    result = seed_demo_user(body.user_id, force=body.force)
    return result


@router.get("/demo/status/{user_id}")
async def demo_status(user_id: str, user: dict = Depends(get_current_user_strict)):
    ensure_user_match(user, user_id)
    stocks = load_portfolio("stock_portfolios", user_id) or []
    crypto = load_portfolio("crypto_portfolios", user_id) or []
    penny = load_portfolio("penny_portfolios", user_id) or []
    bets = list_bets(user_id)
    return {
        "has_stocks": len(stocks) > 0,
        "has_crypto": len(crypto) > 0,
        "has_penny": len(penny) > 0,
        "has_bets": len(bets) > 0,
        "stock_count": len(stocks),
        "crypto_count": len(crypto),
        "penny_count": len(penny),
        "bet_count": len(bets),
    }


async def _portfolio_value_stocks(holdings: list[dict]) -> float:
    from services import yfinance_scanner
    symbols = [h["symbol"] for h in holdings]
    prices = yfinance_scanner.fetch_quotes(symbols)
    total = 0.0
    for h in holdings:
        p = prices.get(h["symbol"].upper(), h.get("avg_cost") or 0)
        total += float(h.get("shares", 0)) * p
    return round(total, 2)


async def _portfolio_value_crypto(holdings: list[dict]) -> float:
    from services import coingecko
    symbols = [h["symbol"] for h in holdings]
    prices = await coingecko.fetch_prices(symbols)
    total = 0.0
    for h in holdings:
        p = prices.get(h["symbol"].upper(), h.get("avg_cost") or 0)
        total += float(h.get("amount", 0)) * p
    return round(total, 2)


async def _portfolio_value_penny(holdings: list[dict]) -> float:
    from services import penny_scanner
    symbols = [h["symbol"] for h in holdings]
    prices = penny_scanner.fetch_penny_quotes(symbols)
    total = 0.0
    for h in holdings:
        p = prices.get(h["symbol"].upper(), h.get("avg_cost") or 0)
        total += float(h.get("shares", 0)) * p
    return round(total, 2)


async def _with_llm(
    module: str,
    summary: str,
    recs,
    picks=None,
    portfolio_value: float | None = None,
    user_id: str = "demo",
) -> AdvisorResponse:
    news_items = await news_feed.fetch_news_for_analysis(module, user_id, limit=6)
    narrative = await llm.enrich_analysis(module, summary, recs, picks, news=news_items)
    scans = deep_scan.build_deep_scans(module, recs, picks)
    from models.schemas import NewsItem
    news = [NewsItem(**n) for n in news_items]
    return AdvisorResponse(
        module=module,
        summary=summary,
        recommendations=recs,
        picks=picks or [],
        ai_narrative=narrative,
        deep_scans=scans,
        portfolio_value=portfolio_value,
        news=news,
    )


@router.get("/modules")
async def list_modules():
    return {"modules": MODULES, "bundlePrice": 109}


@router.get("/modules/{user_id}")
async def user_modules(user_id: str, user: dict = Depends(get_current_user_strict)):
    ensure_user_match(user, user_id)
    from services.simulation import ensure_sim_trial

    sim = ensure_sim_trial(user_id)
    plan = get_user_plan(user_id)
    paid = [m for m in get_active_modules(user_id) if m not in ("annual", "bundle")]
    entitled = [m for m in paid if m in plan["allowedMarkets"]]
    return {
        "active": entitled,
        "simulation": sim,
        "catalog": MODULES,
        "hasAnnual": plan["hasAnnual"],
        "annualPrice": settings.annual_price_usd,
        "bundlePrice": settings.bundle_price_usd,
        "tier": plan["tier"],
        "selectedMarkets": plan["selectedMarkets"],
        "allowedMarkets": plan["allowedMarkets"],
        "features": plan["features"],
        "entitlements": plan["entitlements"],
    }


@router.get("/win-hook/{module}")
async def win_hook_story(module: str):
    from services.win_hooks import random_win
    key = module if module in MODULES or module == "bundle" else "trades"
    return random_win(key)


@router.post("/trades/portfolio")
async def save_stock_portfolio(body: PortfolioRequest, user: dict = Depends(get_current_user_strict)):
    ensure_user_match(user, body.user_id)
    require_module(body.user_id, "trades")
    require_feature(body.user_id, "portfolio_intelligence")
    from services.symbol_universe import validate_portfolio_for_module

    validate_portfolio_for_module(body.holdings, "trades")
    save_portfolio("stock_portfolios", body.user_id, body.holdings, datetime.now(timezone.utc).isoformat())
    return {"saved": True, "count": len(body.holdings)}


@router.get("/trades/portfolio/{user_id}")
async def get_stock_portfolio(user_id: str, user: dict = Depends(get_current_user_strict)):
    ensure_user_match(user, user_id)
    require_module(user_id, "trades")
    require_feature(user_id, "portfolio_intelligence")
    return {"holdings": load_portfolio("stock_portfolios", user_id) or []}


@router.post("/trades/analyze")
async def analyze_trades(body: PortfolioRequest, user: dict = Depends(get_current_user_strict)):
    ensure_user_match(user, body.user_id)
    require_module(body.user_id, "trades")
    require_feature(body.user_id, "portfolio_intelligence")
    from services.symbol_universe import validate_portfolio_for_module

    holdings = body.holdings or load_portfolio("stock_portfolios", body.user_id) or []
    validate_portfolio_for_module(holdings, "trades")
    if not holdings:
        raise HTTPException(400, "Add holdings first — e.g. AAPL 10 shares @ $180")
    summary, recs = await advisor.analyze_stock_portfolio(holdings)
    value = await _portfolio_value_stocks(holdings)
    return await _with_llm("trades", summary, recs, portfolio_value=value, user_id=body.user_id)


@router.post("/crypto/portfolio")
async def save_crypto_portfolio(body: PortfolioRequest, user: dict = Depends(get_current_user_strict)):
    ensure_user_match(user, body.user_id)
    require_module(body.user_id, "crypto")
    require_feature(body.user_id, "portfolio_intelligence")
    save_portfolio("crypto_portfolios", body.user_id, body.holdings, datetime.now(timezone.utc).isoformat())
    return {"saved": True, "count": len(body.holdings)}


@router.get("/crypto/portfolio/{user_id}")
async def get_crypto_portfolio(user_id: str, user: dict = Depends(get_current_user_strict)):
    ensure_user_match(user, user_id)
    require_module(user_id, "crypto")
    require_feature(user_id, "portfolio_intelligence")
    return {"holdings": load_portfolio("crypto_portfolios", user_id) or []}


@router.post("/crypto/analyze")
async def analyze_crypto(body: PortfolioRequest, user: dict = Depends(get_current_user_strict)):
    ensure_user_match(user, body.user_id)
    require_module(body.user_id, "crypto")
    require_feature(body.user_id, "portfolio_intelligence")
    holdings = body.holdings or load_portfolio("crypto_portfolios", body.user_id) or []
    if not holdings:
        raise HTTPException(400, "Add crypto holdings — e.g. BTC 0.5, ETH 2.0")
    summary, recs = await advisor.analyze_crypto_portfolio(holdings)
    value = await _portfolio_value_crypto(holdings)
    return await _with_llm("crypto", summary, recs, portfolio_value=value, user_id=body.user_id)


@router.post("/penny/portfolio")
async def save_penny_portfolio(body: PortfolioRequest, user: dict = Depends(get_current_user_strict)):
    ensure_user_match(user, body.user_id)
    require_module(body.user_id, "penny")
    require_feature(body.user_id, "portfolio_intelligence")
    from services.symbol_universe import validate_portfolio_for_module

    validate_portfolio_for_module(body.holdings, "penny")
    save_portfolio("penny_portfolios", body.user_id, body.holdings, datetime.now(timezone.utc).isoformat())
    return {"saved": True, "count": len(body.holdings)}


@router.get("/penny/portfolio/{user_id}")
async def get_penny_portfolio(user_id: str, user: dict = Depends(get_current_user_strict)):
    ensure_user_match(user, user_id)
    require_module(user_id, "penny")
    require_feature(user_id, "portfolio_intelligence")
    return {"holdings": load_portfolio("penny_portfolios", user_id) or []}


@router.post("/penny/analyze")
async def analyze_penny(body: PortfolioRequest, user: dict = Depends(get_current_user_strict)):
    ensure_user_match(user, body.user_id)
    require_module(body.user_id, "penny")
    require_feature(body.user_id, "portfolio_intelligence")
    from services.symbol_universe import validate_portfolio_for_module

    holdings = body.holdings or load_portfolio("penny_portfolios", body.user_id) or []
    if not holdings:
        raise HTTPException(400, "Add pink slip holdings — e.g. SNDL 5000 shares @ $0.40")
    validate_portfolio_for_module(holdings, "penny")
    summary, recs = await advisor.analyze_penny_portfolio(holdings)
    value = await _portfolio_value_penny(holdings)
    return await _with_llm("penny", summary, recs, portfolio_value=value, user_id=body.user_id)


@router.post("/betting/bets")
async def create_bet(body: BetEntry, user: dict = Depends(get_current_user_strict)):
    ensure_user_match(user, body.user_id)
    require_module(body.user_id, "betting")
    is_sim = sim_has_module(body.user_id, "betting") and not has_paid_module(body.user_id, "betting")
    bet_id = add_bet(
        body.user_id,
        body.matchup,
        body.pick,
        body.odds,
        body.stake,
        datetime.now(timezone.utc).isoformat(),
        sport=body.sport,
        is_simulation=is_sim,
    )
    result: dict = {"id": bet_id}
    if is_sim:
        result["simulation"] = settle_simulation_bet(
            bet_id,
            body.user_id,
            body.matchup,
            body.pick,
            body.odds,
            body.stake,
        )
    return result


@router.get("/betting/bets/{user_id}")
async def get_bets(user_id: str, user: dict = Depends(get_current_user_strict)):
    ensure_user_match(user, user_id)
    require_module(user_id, "betting")
    return {"bets": list_bets(user_id)}


@router.post("/betting/analyze")
async def analyze_betting(user_id: str = Query(default="demo"), user: dict = Depends(get_current_user_strict)):
    ensure_user_match(user, user_id)
    require_module(user_id, "betting")
    bets = list_bets(user_id)
    summary, bet_recs, picks = await advisor.analyze_bets(bets)
    total_stake = sum(float(b.get("stake") or 0) for b in bets)
    return await _with_llm("betting", summary, bet_recs, picks, portfolio_value=total_stake, user_id=user_id)


@router.get("/betting/picks")
async def ai_picks(user_id: str = Query(default="demo"), user: dict = Depends(get_current_user_strict)):
    ensure_user_match(user, user_id)
    require_module(user_id, "betting")
    _, _, picks = await advisor.analyze_bets([])
    return {"picks": picks}


@router.post("/predictions/positions")
async def create_prediction(body: PredictionEntry, user: dict = Depends(get_current_user_strict)):
    ensure_user_match(user, body.user_id)
    require_module(body.user_id, "predictions")
    is_sim = sim_has_module(body.user_id, "predictions") and not has_paid_module(body.user_id, "predictions")
    yes_price = body.yes_price or 0.5
    pid = add_prediction(
        body.user_id,
        body.market,
        body.category,
        body.pick,
        body.stake,
        yes_price,
        datetime.now(timezone.utc).isoformat(),
        is_simulation=is_sim,
    )
    result: dict = {"id": pid}
    if is_sim:
        result["simulation"] = settle_simulation_prediction(
            pid,
            body.user_id,
            body.market,
            body.pick,
            body.stake,
            yes_price,
        )
    return result


@router.get("/predictions/positions/{user_id}")
async def get_predictions(user_id: str, user: dict = Depends(get_current_user_strict)):
    ensure_user_match(user, user_id)
    require_module(user_id, "predictions")
    return {"positions": list_predictions(user_id)}


@router.post("/predictions/analyze")
async def analyze_predictions(user_id: str = Query(default="demo"), user: dict = Depends(get_current_user_strict)):
    ensure_user_match(user, user_id)
    require_module(user_id, "predictions")
    positions = list_predictions(user_id)
    summary, recs = await advisor.analyze_predictions(positions)
    total_stake = sum(float(p.get("stake") or 0) for p in positions)
    return await _with_llm("predictions", summary, recs, portfolio_value=total_stake, user_id=user_id)


@router.post("/billing/tier-checkout")
async def tier_checkout(body: TierCheckoutRequest, user: dict = Depends(get_current_user_strict)):
    """Checkout for Lite / Pro / Ultra / Ultra+ / Elite intelligence tiers."""
    ensure_user_match(user, body.user_id)
    from services.tier_billing import activate_tier_plan, tier_amount_usd, validate_tier_markets

    tier = body.tier.strip().lower()
    valid_tiers = {"lite", "pro", "ultra", "ultra_plus", "elite"}
    if tier not in valid_tiers:
        raise HTTPException(400, f"Unknown tier: {body.tier}")

    try:
        markets = validate_tier_markets(tier, body.selected_markets)
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc

    price_map = {
        "lite": settings.stripe_price_lite,
        "pro": settings.stripe_price_pro,
        "ultra": settings.stripe_price_ultra,
        "ultra_plus": settings.stripe_price_ultra_plus,
        "elite": settings.stripe_price_elite,
    }
    price_id = price_map.get(tier, "")

    if not settings.stripe_secret_key or not price_id:
        persist_acquisition(body.user_id, body.acquisition_channel)
        plan = activate_tier_plan(body.user_id, tier, markets, payment_method="demo")
        record_payment_event(
            body.user_id,
            tier_amount_usd(tier),
            payment_method="demo",
            plan_tier=tier,
            module=tier,
        )
        return {
            "checkoutUrl": None,
            "demoMode": True,
            "tier": plan["tier"],
            "selectedMarkets": plan["selectedMarkets"],
            "allowedMarkets": plan["allowedMarkets"],
            "message": f"{tier.replace('_', ' ').title()} plan activated (demo)",
        }

    import stripe

    stripe.api_key = settings.stripe_secret_key
    meta = stripe_checkout_metadata(
        body.user_id,
        tier,
        acquisition_channel=body.acquisition_channel,
        plan_tier=tier,
        tier=tier,
        selected_markets=markets,
    )
    persist_acquisition(body.user_id, body.acquisition_channel)
    from services.billing_urls import resolve_checkout_urls

    success_url, cancel_url = resolve_checkout_urls(
        tier=tier,
        success_url=body.success_url,
        cancel_url=body.cancel_url,
    )
    subscription_data: dict = {"metadata": meta}
    if tier != "elite":
        subscription_data["trial_period_days"] = 3
    session = stripe.checkout.Session.create(
        mode="subscription",
        line_items=[{"price": price_id, "quantity": 1}],
        success_url=success_url,
        cancel_url=cancel_url,
        subscription_data=subscription_data,
        metadata=meta,
    )
    return {"checkoutUrl": session.url, "sessionId": session.id}


@router.post("/billing/module-checkout")
async def module_checkout(body: ModuleCheckoutRequest, user: dict = Depends(get_current_user_strict)):
    ensure_user_match(user, body.user_id)
    if body.module not in MODULES and body.module != "bundle":
        raise HTTPException(400, f"Unknown module: {body.module}")

    price_map = {
        "trades": settings.stripe_price_trades,
        "crypto": settings.stripe_price_crypto,
        "betting": settings.stripe_price_betting,
        "penny": settings.stripe_price_penny,
        "predictions": settings.stripe_price_predictions,
        "bundle": settings.stripe_price_bundle,
    }
    price_id = price_map.get(body.module, "")

    if not settings.stripe_secret_key or not price_id:
        modules_to_activate = list(MODULES.keys()) if body.module == "bundle" else [body.module]
        tier = "bundle" if body.module == "bundle" else "monthly"
        amount = settings.bundle_price_usd if body.module == "bundle" else 29 * len(modules_to_activate)
        persist_acquisition(body.user_id, body.acquisition_channel)
        for m in modules_to_activate:
            set_module_access(body.user_id, m, True, plan_tier=tier, payment_method="demo")
        record_payment_event(
            body.user_id,
            amount,
            payment_method="demo",
            plan_tier=tier,
            module=body.module,
        )
        return {
            "checkoutUrl": None,
            "demoMode": True,
            "active": get_active_modules(body.user_id),
            "message": f"Module(s) activated — {', '.join(modules_to_activate)}",
        }

    import stripe

    stripe.api_key = settings.stripe_secret_key
    meta = stripe_checkout_metadata(
        body.user_id,
        body.module,
        acquisition_channel=body.acquisition_channel,
    )
    persist_acquisition(body.user_id, body.acquisition_channel)
    session = stripe.checkout.Session.create(
        mode="subscription",
        line_items=[{"price": price_id, "quantity": 1}],
        success_url=body.success_url,
        cancel_url=body.cancel_url,
        subscription_data={
            "trial_period_days": 3,
            "metadata": meta,
        },
        metadata=meta,
    )
    return {"checkoutUrl": session.url, "sessionId": session.id}


class BillingPortalRequest(BaseModel):
    user_id: str
    return_url: str | None = None


@router.post("/billing/portal")
async def billing_portal(body: BillingPortalRequest, user: dict = Depends(get_current_user_strict)):
    ensure_user_match(user, body.user_id)
    if not settings.stripe_secret_key:
        raise HTTPException(503, "Stripe not configured")
    row = get_user_record(body.user_id)
    customer_id = row.get("stripe_customer_id") if row else None
    if not customer_id:
        raise HTTPException(400, "No billing account yet — subscribe first")
    import stripe

    stripe.api_key = settings.stripe_secret_key
    from services.billing_urls import billing_portal_return_url

    return_url = body.return_url or billing_portal_return_url()
    session = stripe.billing_portal.Session.create(
        customer=customer_id,
        return_url=return_url,
    )
    return {"url": session.url}


@router.get("/billing/plans")
async def billing_plans():
    from services.billing_urls import public_billing_config
    from services.tier_billing import TIER_USD

    stripe_ok = bool(settings.stripe_secret_key)
    tier_prices = {
        "lite": settings.stripe_price_lite,
        "pro": settings.stripe_price_pro,
        "ultra": settings.stripe_price_ultra,
        "ultra_plus": settings.stripe_price_ultra_plus,
        "elite": settings.stripe_price_elite,
    }
    return {
        "demoMode": not stripe_ok or not any(tier_prices.values()),
        "stripeConfigured": stripe_ok,
        **public_billing_config(),
        "tiers": [
            {
                "id": tid,
                "monthlyUsd": None if tid == "elite" else TIER_USD[tid],  # type: ignore[index]
                "annualUsd": TIER_USD["elite"] if tid == "elite" else None,
                "stripePriceConfigured": bool(tier_prices.get(tid)),
            }
            for tid in ("lite", "pro", "ultra", "ultra_plus", "elite")
        ],
        "markets": [
            {"id": "stocks", "module": "trades", "label": "Stocks"},
            {"id": "crypto", "module": "crypto", "label": "Crypto"},
            {"id": "pink_slips", "module": "penny", "label": "Pink Slips"},
            {"id": "sports_betting", "module": "betting", "label": "Sports betting"},
            {"id": "prediction_markets", "module": "predictions", "label": "Prediction markets"},
        ],
        "legacy": {
            "monthlyModule": 29,
            "monthlyBundle": settings.bundle_price_usd,
            "annualAllAccess": settings.annual_price_usd,
        },
        "annualNote": "Elite annual plan is non-refundable. Monthly plans may be cancelled anytime.",
    }


class AnnualCheckoutRequest(BaseModel):
    user_id: str = "demo"
    success_url: str
    cancel_url: str
    acquisition_channel: str | None = None


@router.post("/billing/annual-checkout")
async def annual_checkout(body: AnnualCheckoutRequest, user: dict = Depends(get_current_user_strict)):
    ensure_user_match(user, body.user_id)
    if not settings.stripe_secret_key or not settings.stripe_price_annual:
        persist_acquisition(body.user_id, body.acquisition_channel)
        activate_annual_plan(body.user_id)
        record_payment_event(
            body.user_id,
            settings.annual_price_usd,
            payment_method="demo",
            plan_tier="annual",
            module="annual",
        )
        return {
            "checkoutUrl": None,
            "demoMode": True,
            "hasAnnual": True,
            "message": "Annual All-Access activated (demo)",
        }

    import stripe

    stripe.api_key = settings.stripe_secret_key
    meta = stripe_checkout_metadata(
        body.user_id,
        "annual",
        acquisition_channel=body.acquisition_channel,
        plan_tier="annual",
    )
    persist_acquisition(body.user_id, body.acquisition_channel)
    session = stripe.checkout.Session.create(
        mode="subscription",
        line_items=[{"price": settings.stripe_price_annual, "quantity": 1}],
        success_url=body.success_url,
        cancel_url=body.cancel_url,
        subscription_data={"metadata": meta},
        metadata=meta,
    )
    return {"checkoutUrl": session.url, "sessionId": session.id}
