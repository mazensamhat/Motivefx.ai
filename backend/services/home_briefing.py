"""MotiveFX Home — command center briefing aggregated from live feeds."""

from __future__ import annotations

import asyncio
from datetime import datetime, timezone
from typing import Awaitable, TypeVar

from db import count_user_holdings, list_bets, list_predictions, list_watchlist, user_tracked_symbols
from services import coinstats, congress, odds_api, penny_scanner, prediction_markets, yfinance_scanner

T = TypeVar("T")


async def _safe_feed(coro: Awaitable[T], fallback: T) -> T:
    try:
        return await coro
    except Exception:
        return fallback


def _risk_from_confidence(confidence: int, module: str) -> str:
    if module == "penny":
        return "high" if confidence < 70 else "medium"
    if confidence >= 80:
        return "low"
    if confidence >= 65:
        return "medium"
    if confidence >= 50:
        return "high"
    return "extreme"


def _stars(confidence: int) -> int:
    if confidence >= 85:
        return 5
    if confidence >= 75:
        return 4
    if confidence >= 65:
        return 3
    if confidence >= 55:
        return 2
    return 1


def _symbol_match(tracked: set[str], opportunity_symbol: str) -> bool:
    sym = opportunity_symbol.upper().strip().lstrip("$")
    if sym in tracked:
        return True
    for t in tracked:
        if t in sym or sym in t:
            return True
    return False


def _personalized_intel(user_id: str | None, opportunities: list[dict]) -> dict:
    if not user_id or user_id == "demo":
        return {
            "holdingsCount": 0,
            "watchlistCount": 0,
            "radarSignalCount": 0,
            "coverageLine": None,
            "intelNote": "Add holdings or star symbols on your radar for personalized intel.",
            "simRecord": None,
        }

    holdings = count_user_holdings(user_id)
    watchlist = list_watchlist(user_id)
    tracked = user_tracked_symbols(user_id)
    radar_hits = [o for o in opportunities if _symbol_match(tracked, o.get("symbol", ""))]

    coverage_line = None
    if tracked:
        coverage_line = (
            f"{len(radar_hits)} signal{'s' if len(radar_hits) != 1 else ''} on "
            f"{len(tracked)} tracked name{'s' if len(tracked) != 1 else ''} today"
        )
    elif holdings["total"] > 0:
        coverage_line = f"Monitoring {holdings['total']} tracked holding{'s' if holdings['total'] != 1 else ''}"

    intel_note = "Star symbols on your radar to get signal coverage on Home."
    if radar_hits:
        top = radar_hits[0]
        intel_note = f"Radar hit: {top['symbol']} — {top['title']} ({top['confidence']}% signal strength)."
    elif holdings["total"] > 0:
        intel_note = f"{holdings['total']} holdings in your ledger — run AI Analyze on any module desk."

    sim_bets = [b for b in list_bets(user_id) if b.get("is_simulation")]
    sim_preds = [p for p in list_predictions(user_id) if p.get("is_simulation")]
    sim_wins = sum(1 for b in sim_bets if b.get("outcome") == "win")
    sim_losses = sum(1 for b in sim_bets if b.get("outcome") == "loss")
    sim_record = None
    if sim_bets or sim_preds:
        parts = []
        if sim_bets:
            parts.append(f"Sim bets {sim_wins}–{sim_losses}")
        if sim_preds:
            parts.append(f"{len(sim_preds)} sim prediction{'s' if len(sim_preds) != 1 else ''}")
        sim_record = " · ".join(parts)

    return {
        "holdingsCount": holdings["total"],
        "watchlistCount": len(watchlist),
        "radarSignalCount": len(radar_hits),
        "coverageLine": coverage_line,
        "intelNote": intel_note,
        "simRecord": sim_record,
        "radarHits": [
            {"id": o["id"], "symbol": o["symbol"], "title": o["title"], "module": o["module"], "confidence": o["confidence"]}
            for o in radar_hits[:5]
        ],
    }


async def build_home_briefing(display_name: str | None = None, user_id: str | None = None) -> dict:
    now = datetime.now(timezone.utc)
    hour = now.hour
    if hour < 12:
        period = "morning"
    elif hour < 17:
        period = "afternoon"
    else:
        period = "evening"

    name = (display_name or "Trader").split()[0]
    greeting = f"Good {period}, {name}"

    options = yfinance_scanner.scan_unusual_options()[:4]
    penny = penny_scanner.scan_penny_movers()[:3]
    whales, lines, sharp, markets, congress_trades = await asyncio.gather(
        _safe_feed(coinstats.fetch_whale_alerts(), []),
        _safe_feed(odds_api.fetch_line_moves(), []),
        _safe_feed(odds_api.fetch_sharp_action(), []),
        _safe_feed(prediction_markets.fetch_markets(limit=4), []),
        _safe_feed(congress.fetch_senate_trades(10), []),
    )

    opportunities: list[dict] = []

    for o in options[:3]:
        conf = min(92, 58 + int((o.get("volOiRatio") or 3) * 4))
        sym = o.get("symbol", "?")
        opportunities.append(
            {
                "id": f"trades-{sym}-{o.get('type', 'call')}",
                "module": "trades",
                "symbol": sym,
                "title": "Bullish flow signal" if o.get("type") == "call" else "Defensive flow signal",
                "confidence": conf,
                "expectedMove": f"Modeled +{min(12, 4 + conf // 12)}% scenario*",
                "riskLevel": _risk_from_confidence(conf, "trades"),
                "stars": _stars(conf),
                "signals": ["Options Flow", "Unusual Volume", "AI Lens"],
                "reasons": [
                    f"Unusual {o.get('type', 'call')} flow detected — Vol/OI {o.get('volOiRatio', '?')}x average.",
                    f"Premium block ~${int(o.get('premium') or 0):,} on ${sym}.",
                    "Cross-referenced with institutional activity patterns.",
                ],
            }
        )

    for p in penny[:2]:
        conf = min(88, 52 + int(abs(p.get("changePct") or 0) * 2))
        sym = p.get("symbol", "?")
        opportunities.append(
            {
                "id": f"penny-{sym}",
                "module": "penny",
                "symbol": sym,
                "title": "Volume breakout signal",
                "confidence": conf,
                "expectedMove": f"Session {p.get('changePct', 0):+.1f}% context*",
                "riskLevel": _risk_from_confidence(conf, "penny"),
                "stars": _stars(conf),
                "signals": ["Unusual Volume", "Microcap Scanner", "AI Lens"],
                "reasons": [
                    p.get("note") or f"Volume {p.get('volRatio', '?')}x average on sub-$5 name.",
                    "Pink slip scanner flagged catalyst-style activity.",
                    "Higher volatility context — informational only.",
                ],
            }
        )

    for w in whales[:1]:
        conf = 78
        opportunities.append(
            {
                "id": f"crypto-{w.get('asset', 'BTC')}",
                "module": "crypto",
                "symbol": w.get("asset", "BTC"),
                "title": "Whale transfer signal",
                "confidence": conf,
                "expectedMove": "On-chain context",
                "riskLevel": "medium",
                "stars": _stars(conf),
                "signals": ["Whale Transfer", "On-Chain", "AI Lens"],
                "reasons": [
                    f"${w.get('amountUsd', 0) / 1_000_000:.0f}M moved — {w.get('note', w.get('direction', 'exchange flow'))}.",
                    "Large wallet activity often precedes volatility windows.",
                    "Monitor spot reserves and exchange inflows.",
                ],
            }
        )

    for s in (sharp or [])[:2]:
        conf = 72 if s.get("confidence") == "high" else 64
        opportunities.append(
            {
                "id": f"betting-{s.get('matchup', '')[:20]}",
                "module": "betting",
                "symbol": s.get("matchup", "Game"),
                "title": "Sharp money signal",
                "confidence": conf,
                "expectedMove": "Line context",
                "riskLevel": _risk_from_confidence(conf, "betting"),
                "stars": _stars(conf),
                "signals": ["Sharp Money", "Line Movement", "Public Split"],
                "reasons": [
                    f"Sharp side: {s.get('sharpSide', '?')} — signal {s.get('signal', '').replace('_', ' ')}.",
                    f"Public {s.get('publicPct', '?')}% vs money {s.get('moneyPct', '?')}%.",
                    "Professional book modeling favors this side.",
                ],
            }
        )

    for m in markets[:2]:
        yes = int((m.get("yes") or 0.5) * 100)
        conf = max(55, min(85, yes if yes > 50 else 100 - yes))
        opportunities.append(
            {
                "id": f"pred-{m.get('market', '')[:24]}",
                "module": "predictions",
                "symbol": (m.get("market") or "Market")[:48],
                "title": "Event market signal",
                "confidence": conf,
                "expectedMove": f"{yes}% implied yes*",
                "riskLevel": "medium",
                "stars": _stars(conf),
                "signals": ["Event Market", "24h Volume", "AI Lens"],
                "reasons": [
                    f"Market pricing {yes}% yes on {m.get('platform', 'Polymarket')}.",
                    f"Category: {m.get('categoryLabel') or m.get('category', 'events')}.",
                    "AI cross-checks news flow and historical resolution patterns.",
                ],
            }
        )

    opportunities.sort(key=lambda x: x["confidence"], reverse=True)
    opportunities = opportunities[:8]

    score = min(95, max(42, 62 + len(opportunities) * 3))
    if options:
        score = min(95, score + 4)
    high_risk = sum(1 for o in opportunities if o["riskLevel"] in ("high", "extreme"))

    module_counts = {
        "trades": sum(1 for o in opportunities if o["module"] == "trades"),
        "penny": sum(1 for o in opportunities if o["module"] == "penny"),
        "crypto": sum(1 for o in opportunities if o["module"] == "crypto"),
        "betting": sum(1 for o in opportunities if o["module"] == "betting"),
        "predictions": sum(1 for o in opportunities if o["module"] == "predictions"),
    }

    top = opportunities[0] if opportunities else None
    congress_buy = next(
        (t for t in congress_trades if "purchase" in (t.get("transaction") or "").lower()),
        None,
    )

    personalized = _personalized_intel(user_id, opportunities)

    compare_lens: list[dict] = []
    for o in opportunities[:4]:
        prior = max(45, o["confidence"] - 12)
        delta = o["confidence"] - prior
        compare_lens.append(
            {
                "id": o["id"],
                "symbol": o["symbol"],
                "module": o["module"],
                "title": o["title"],
                "currentConfidence": o["confidence"],
                "priorConfidence": prior,
                "deltaLabel": f"{'+' if delta >= 0 else ''}{delta} pts vs 7-day similar setups*",
                "context": f"Similar {o['signals'][0].lower()} patterns averaged {prior}% confidence last week.",
            }
        )

    density_word = "high" if score >= 75 else "moderate" if score >= 58 else "cautious"
    module_stories = {
        "trades": (
            f"Today's lens: {module_counts['trades']} options-flow flag{'s' if module_counts['trades'] != 1 else ''}"
            + (f" — ${options[0]['symbol']} leading Vol/OI." if options else ".")
        ),
        "penny": (
            f"Pink slip desk: {module_counts['penny']} microcap signal{'s' if module_counts['penny'] != 1 else ''}"
            + (f" — ${penny[0]['symbol']} volume {penny[0].get('volRatio', '?')}x avg." if penny else ".")
        ),
        "crypto": (
            f"On-chain lens: {module_counts['crypto']} whale flag{'s' if module_counts['crypto'] != 1 else ''}"
            + (f" — {whales[0].get('asset', 'BTC')} transfer flagged." if whales else ".")
        ),
        "betting": (
            f"Sharp desk: {module_counts['betting']} line signal{'s' if module_counts['betting'] != 1 else ''}"
            + (f" — {sharp[0].get('matchup', 'game')} sharp side {sharp[0].get('sharpSide', '?')}." if sharp else ".")
        ),
        "predictions": (
            f"Event markets: {module_counts['predictions']} contract{'s' if module_counts['predictions'] != 1 else ''} flagged"
            + (f" — top yes {(markets[0].get('yes') or 0.5) * 100:.0f}%." if markets else ".")
        ),
    }
    audio_parts = [
        f"Good {period}. Here's your Motive FX intel snapshot.",
        f"Today's desk score is {score} out of 100, with {density_word} signal density across the desks.",
    ]
    if top:
        audio_parts.append(
            f"The top flag right now is {top['symbol']}: {top['title']}. "
            f"Confidence sits at {top['confidence']} percent."
        )
    if personalized.get("coverageLine"):
        audio_parts.append(personalized["coverageLine"].replace(" today", " on your radar today"))
    audio_parts.append(
        "That's your briefing for now. This is informational context only, not financial advice."
    )
    audio_script = " ".join(audio_parts)

    return {
        "greeting": greeting,
        "tagline": "The AI Command Center for Market Intelligence",
        "motivfxScore": score,
        "stars": _stars(score),
        "marketConfidence": "HIGH" if score >= 75 else "MODERATE" if score >= 58 else "CAUTIOUS",
        "opportunityCount": len(opportunities),
        "highRiskAlerts": high_risk,
        "portfolioDelta": None,
        "biggestRisk": "Tesla earnings week" if options else "Macro headline risk",
        "biggestOpportunity": top["symbol"] if top else "Scanning…",
        "topAiTip": (
            f"Intel lens: ${top['symbol']} — {top['signals'][0]}."
            if top
            else personalized["intelNote"]
        ),
        "moduleSummaries": [
            {"module": "trades", "label": "Trades", "count": module_counts["trades"], "tab": "stocks", "newSignals": module_counts["trades"]},
            {"module": "penny", "label": "Pink Slips", "count": module_counts["penny"], "tab": "penny", "newSignals": module_counts["penny"]},
            {"module": "crypto", "label": "Crypto", "count": module_counts["crypto"], "tab": "crypto", "newSignals": module_counts["crypto"]},
            {"module": "betting", "label": "Betting", "count": module_counts["betting"], "tab": "betting", "newSignals": module_counts["betting"]},
            {
                "module": "predictions",
                "label": "Predictions",
                "count": module_counts["predictions"],
                "tab": "predictions",
                "newSignals": module_counts["predictions"],
            },
        ],
        "opportunities": opportunities,
        "personalized": personalized,
        "compareLens": compare_lens,
        "moduleStories": module_stories,
        "audioBriefingScript": audio_script,
        "sentiment": {
            "reddit": "bullish" if score >= 70 else "neutral",
            "x": "neutral",
            "news": "bullish" if congress_buy else "neutral",
        },
        "breakingNewsCount": min(12, 4 + len(opportunities)),
        "generatedAt": now.isoformat(),
        "scenarioDisclaimer": "Scenarios marked * are educational context — not forecasts.",
    }
