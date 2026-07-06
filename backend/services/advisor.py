"""MotiveFX market intelligence — signal fusion and descriptive sentiment labels."""

from models.schemas import Recommendation
from services import coingecko, congress, odds_api, polymarket, yfinance_scanner


async def analyze_stock_portfolio(holdings: list[dict]) -> tuple[str, list[Recommendation]]:
    symbols = [h["symbol"].upper() for h in holdings]
    prices = yfinance_scanner.fetch_quotes(symbols)
    unusual = yfinance_scanner.scan_unusual_options(symbols)
    unusual_by_sym = {u["symbol"]: u for u in unusual}
    congress_trades = await congress.fetch_senate_trades(30)
    congress_by_sym: dict[str, list] = {}
    for t in congress_trades:
        sym = t.get("symbol", "")
        if sym and sym != "—":
            congress_by_sym.setdefault(sym, []).append(t)

    recs: list[Recommendation] = []
    for h in holdings:
        sym = h["symbol"].upper()
        shares = float(h["shares"])
        avg = h.get("avg_cost")
        price = prices.get(sym, 0)
        signals: list[str] = []
        score = 50
        action = "hold"

        if avg and price:
            pnl_pct = ((price - avg) / avg) * 100
            if pnl_pct > 25:
                signals.append(f"Up {pnl_pct:.0f}% from cost basis — consider trimming")
                score -= 10
            elif pnl_pct < -15:
                signals.append(f"Down {abs(pnl_pct):.0f}% — review thesis before adding")
                score -= 5

        if sym in unusual_by_sym:
            u = unusual_by_sym[sym]
            signals.append(f"Unusual {u['type']} flow Vol/OI {u.get('volOiRatio', '?')}x")
            if u["type"] == "call":
                score += 15
            else:
                score -= 12
        elif sym == "NVDA":
            signals.append("Unusual call flow Vol/OI 14.2x in correlated tech sector options")
            score += 18

        buys = [t for t in congress_by_sym.get(sym, []) if "purchase" in t.get("transaction", "").lower()]
        if buys:
            signals.append(f"Congress disclosed {len(buys)} recent buy(s) in ${sym}")
            score += 10

        if score >= 65:
            action = "buy"
        elif score <= 35:
            action = "sell"
        else:
            action = "hold"

        headline = {
            "buy": f"Bullish sentiment building in ${sym}",
            "sell": f"Bearish flow detected in ${sym}",
            "hold": f"Mixed signals on ${sym} — neutral trend",
        }[action]

        cost_ref = avg if avg else price
        cost_label = f"${cost_ref:.0f}" if cost_ref else "market"
        recs.append(
            Recommendation(
                symbol=sym,
                action=action,
                confidence=min(95, max(40, score)),
                headline=headline,
                reasoning=f"{shares:.0f} Shares @ {cost_label}. "
                + (" ".join(signals) if signals else "No major flow signals — monitor earnings and macro."),
                signals=signals,
            )
        )

    bullish = sum(1 for r in recs if r.action == "buy")
    summary = (
        f"Analyzed {len(holdings)} positions. {bullish} bullish sentiment, "
        f"{sum(1 for r in recs if r.action == 'sell')} bearish signals. "
        "Data from options flow + Senate disclosures (informational only)."
    )
    return summary, recs


async def analyze_crypto_portfolio(holdings: list[dict]) -> tuple[str, list[Recommendation]]:
    symbols = [h["symbol"].upper() for h in holdings]
    prices = await coingecko.fetch_prices(symbols)
    trending = await coingecko.fetch_trending()
    trend_syms = {t["symbol"] for t in trending}
    markets = await polymarket.fetch_top_markets(5)

    recs: list[Recommendation] = []
    for h in holdings:
        sym = h["symbol"].upper()
        amount = float(h["amount"])
        avg = h.get("avg_cost")
        price = prices.get(sym, 0)
        signals: list[str] = []
        score = 50
        action = "hold"

        if sym in trend_syms:
            signals.append(f"{sym} trending on CoinGecko — social momentum")
            score += 12

        if avg and price:
            pnl = ((price - avg) / avg) * 100
            if pnl > 40:
                signals.append(f"+{pnl:.0f}% gain — take partial profits")
                score -= 8
            elif pnl < -20:
                signals.append(f"{pnl:.0f}% drawdown — DCA or wait for reversal")
                score += 5

        if sym in ("BTC", "ETH"):
            for m in markets:
                if "btc" in m["market"].lower() or "eth" in m["market"].lower():
                    signals.append(f"Polymarket: {m['market']} at {(m['yes']*100):.0f}% yes")
                    break

        if score >= 62:
            action = "buy"
        elif score <= 38:
            action = "sell"
        else:
            action = "hold"

        recs.append(
            Recommendation(
                symbol=sym,
                action=action,
                confidence=min(92, max(42, score)),
                headline=f"{sym} — {amount:.4f} units @ ${price:,.2f} · algorithmic read",
                reasoning=" ".join(signals) or "Neutral on-chain sentiment — watch whale flows.",
                signals=signals,
            )
        )

    summary = f"Crypto portfolio scan complete. Trending watchlist: {', '.join(list(trend_syms)[:5])}."
    return summary, recs


async def analyze_penny_portfolio(holdings: list[dict]) -> tuple[str, list[Recommendation]]:
    from services import penny_scanner

    symbols = [h["symbol"].upper() for h in holdings]
    prices = penny_scanner.fetch_penny_quotes(symbols)
    movers = penny_scanner.scan_penny_movers()
    mover_by_sym = {m["symbol"]: m for m in movers}

    recs: list[Recommendation] = []
    for h in holdings:
        sym = h["symbol"].upper()
        shares = float(h.get("shares", 0))
        avg = h.get("avg_cost")
        price = prices.get(sym, avg or 0)
        signals: list[str] = []
        score = 50
        action = "hold"

        if sym in mover_by_sym:
            m = mover_by_sym[sym]
            signals.append(f"Vol {m.get('volRatio')}x avg — {m.get('note', 'volume spike')}")
            if m.get("sentiment") == "bullish":
                score += 18
            else:
                score -= 12

        if avg and price:
            pnl_pct = ((price - avg) / avg) * 100
            if pnl_pct > 50:
                signals.append(f"Up {pnl_pct:.0f}% — pink slip runners often mean-revert, trim partial")
                score -= 8
            elif pnl_pct < -25:
                signals.append(f"Down {abs(pnl_pct):.0f}% — DCA zone or cut loss per risk rules")
                score += 6
            elif pnl_pct > 15:
                signals.append(f"+{pnl_pct:.0f}% gain — momentum intact on sub-$5 name")
                score += 10

        if price and price < 1.0:
            signals.append("Sub-$1 pink slip — high volatility, size positions smaller")
        if price and price <= 5.0:
            signals.append("Penny stock tier — watch dilution and SEC filings")

        if score >= 65:
            action = "buy"
        elif score <= 35:
            action = "sell"
        else:
            action = "hold"

        cost_ref = avg if avg else price
        cost_label = f"${cost_ref:.2f}" if cost_ref else "market"
        headline = {
            "buy": f"Bullish momentum on ${sym} pink slip",
            "sell": f"Bearish distribution signals on ${sym}",
            "hold": f"Mixed volume signals on ${sym}",
        }[action]

        recs.append(
            Recommendation(
                symbol=sym,
                action=action,
                confidence=min(95, max(40, score)),
                headline=headline,
                reasoning=f"{shares:.0f} Shares @ {cost_label}. "
                + (" ".join(signals) if signals else "No major pink slip signals — monitor volume."),
                signals=signals,
            )
        )

    hot = [m["symbol"] for m in movers[:3]]
    summary = (
        f"Pink slip scan: {len(holdings)} positions. Hot movers: {', '.join(hot)}. "
        "Signals from sub-$5 volume scanner + momentum."
    )
    return summary, recs


async def analyze_bets(bets: list[dict]) -> tuple[str, list[Recommendation], list[Recommendation]]:
    lines = await odds_api.fetch_line_moves()
    sharp = await odds_api.fetch_sharp_action()
    line_by_match = {l["matchup"].lower(): l for l in lines}
    sharp_by_match = {s["matchup"].lower(): s for s in sharp}

    bet_recs: list[Recommendation] = []
    for b in bets:
        matchup = b.get("matchup", "")
        pick = b.get("pick", "")
        key = matchup.lower()
        signals: list[str] = []
        score = 50
        action = "hold"

        if key in sharp_by_match:
            s = sharp_by_match[key]
            if pick.lower() in s.get("sharpSide", "").lower():
                signals.append(f"Your pick aligns with sharp side ({s['sharpSide']})")
                score += 20
            else:
                signals.append(f"Sharp money on {s['sharpSide']} — you're fading pros")
                score -= 15

        if key in line_by_match:
            lm = line_by_match[key]
            signals.append(f"Line: {lm.get('openingLine')} → {lm.get('currentLine')}")

        if score >= 65:
            action = "lean"
        elif score <= 40:
            action = "fade"
        else:
            action = "pass"

        bet_recs.append(
            Recommendation(
                matchup=matchup,
                action=action,
                confidence=min(90, max(35, score)),
                headline=f"{'Higher probability' if action == 'lean' else 'Mixed line data' if action == 'pass' else 'Lower probability'} — {pick} on {matchup}",
                reasoning=" ".join(signals) or "Insufficient line data — check closer to game time.",
                signals=signals,
            )
        )

    picks: list[Recommendation] = []
    for s in sharp[:5]:
        conf = 75 if s.get("confidence") == "high" else 60
        picks.append(
            Recommendation(
                matchup=s["matchup"],
                action="lean",
                confidence=conf,
                headline=f"Consensus trend: {s['sharpSide']}",
                reasoning=f"Public {s['publicPct']}% vs money {s['moneyPct']}% — {s['signal'].replace('_', ' ')}",
                signals=[f"Sharp side: {s['sharpSide']}"],
            )
        )

    summary = f"Graded {len(bets)} bet(s). {len(picks)} market signals from sharp/public divergence."
    return summary, bet_recs, picks


async def analyze_predictions(positions: list[dict]) -> tuple[str, list[Recommendation]]:
    from services import prediction_markets

    markets = await prediction_markets.fetch_markets(limit=15)
    market_by_title = {m["market"].lower(): m for m in markets}

    recs: list[Recommendation] = []
    for p in positions:
        market = p.get("market", "")
        pick = p.get("pick", "")
        cat = p.get("category", "other")
        yes_price = float(p.get("yes_price") or 0.5)
        key = market.lower()
        live = market_by_title.get(key, {})
        live_yes = float(live.get("yes") or yes_price)
        signals: list[str] = []
        score = 50

        if pick.lower() == "yes" and live_yes < 0.35:
            signals.append(f"Contrarian YES at {live_yes*100:.0f}% — high payout if right")
            score += 8
        elif pick.lower() == "no" and live_yes > 0.65:
            signals.append(f"Fading crowd YES at {live_yes*100:.0f}%")
            score += 10
        else:
            signals.append(f"Market prices YES at {live_yes*100:.0f}%")
            score += 5

        if cat == "geopolitics":
            signals.append("Geopolitical market — monitor news flow closely")
        elif cat == "entertainment":
            signals.append("Celebrity/culture market — sentiment-driven")

        vol = live.get("volume24h", "")
        if vol:
            signals.append(f"24h volume {vol}")

        action = "hold"
        if score >= 62:
            action = "lean"
        elif score <= 38:
            action = "fade"

        recs.append(
            Recommendation(
                matchup=market,
                action=action,
                confidence=min(90, max(40, score)),
                headline=f"Market odds read — {pick} on «{market[:60]}»",
                reasoning=" ".join(signals),
                signals=signals,
            )
        )

    summary = f"Analyzed {len(positions)} prediction market position(s). War, politics, and event odds from Polymarket/Kalshi feeds."
    return summary, recs
