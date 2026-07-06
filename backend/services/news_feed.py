"""Contextual news — ranked by relevance to user holdings, bets, and picks."""

from datetime import datetime, timedelta, timezone

from db import list_bets, list_predictions, load_portfolio

# Rich demo corpus — replace with NewsAPI/RSS when keys are configured
NEWS_CORPUS: list[dict] = [
    # Trades / economic
    {"headline": "NVDA surges on data-center demand beat; analysts raise PTs", "summary": "Wall Street lifts NVIDIA targets after hyperscaler capex guides imply sustained GPU demand through 2027.", "source": "Bloomberg", "category": "earnings", "impact": "high", "symbols": ["NVDA"], "modules": ["trades"], "tags": ["tech", "ai"]},
    {"headline": "Fed officials signal patience on cuts amid sticky services inflation", "summary": "FOMC minutes show division on timing of rate reductions — growth stocks sensitive to duration.", "source": "Reuters", "category": "economic", "impact": "high", "symbols": ["SPY", "QQQ", "AAPL", "MSFT"], "modules": ["trades"], "tags": ["macro", "rates"]},
    {"headline": "Apple supply chain report points to stronger iPhone cycle in Asia", "summary": "Key supplier order books suggest AAPL builds ahead of fall launch — watch gross margin guide.", "source": "Nikkei", "category": "earnings", "impact": "medium", "symbols": ["AAPL"], "modules": ["trades"], "tags": ["consumer"]},
    {"headline": "Tesla delivery estimates trimmed on EV subsidy uncertainty", "summary": "Analysts cut Q3 delivery consensus; margin pressure if price cuts continue in China/EU.", "source": "CNBC", "category": "earnings", "impact": "medium", "symbols": ["TSLA"], "modules": ["trades"], "tags": ["auto", "ev"]},
    {"headline": "MSFT Azure growth reaccelerates — enterprise AI contracts cited", "summary": "Channel checks show Copilot attach rates climbing; cloud backlog expands QoQ.", "source": "Barron's", "category": "earnings", "impact": "medium", "symbols": ["MSFT"], "modules": ["trades"], "tags": ["cloud", "ai"]},
    {"headline": "S&P 500 hits record as soft-landing narrative firms", "summary": "Risk-on rotation into megacap tech; VIX compresses to multi-month lows.", "source": "MarketWatch", "category": "economic", "impact": "medium", "symbols": [], "modules": ["trades"], "tags": ["macro"]},
    # Penny
    {"headline": "Cannabis reform bill advances in Senate — SNDL volume spikes", "summary": "Penny cannabis names rally on legislative headline risk; liquidity elevated.", "source": "Politico", "category": "regulatory", "impact": "high", "symbols": ["SNDL"], "modules": ["penny"], "tags": ["cannabis"]},
    {"headline": "AMC meme traders reload as box office beats expectations", "summary": "Retail flow returning to meme complex; borrow rates tighten on AMC.", "source": "WSJ", "category": "market", "impact": "medium", "symbols": ["AMC", "GME"], "modules": ["penny"], "tags": ["meme"]},
    {"headline": "Biotech FDA panel date set for BNGO diagnostic — binary catalyst", "summary": "Adcom calendar published; sub-$2 names historically volatile into decision.", "source": "FDA News", "category": "regulatory", "impact": "high", "symbols": ["BNGO"], "modules": ["penny"], "tags": ["biotech"]},
    {"headline": "Housing data softens — OPEN shares volatile on rate sensitivity", "summary": "Existing home sales miss; iBuyer models face margin scrutiny if rates stay higher.", "source": "HousingWire", "category": "economic", "impact": "medium", "symbols": ["OPEN"], "modules": ["penny"], "tags": ["housing"]},
    # Crypto
    {"headline": "Bitcoin ETF inflows hit 6-week high as institutions re-enter", "summary": "Spot BTC products see $450M net inflow — supports BTC hold thesis near-term.", "source": "CoinDesk", "category": "crypto", "impact": "high", "symbols": ["BTC"], "modules": ["crypto"], "tags": ["etf", "institutional"]},
    {"headline": "Ethereum L2 activity surges — gas fees compress", "summary": "ETH staking yields stable; network usage from DeFi restaking climbs.", "source": "The Block", "category": "crypto", "impact": "medium", "symbols": ["ETH"], "modules": ["crypto"], "tags": ["defi"]},
    {"headline": "Solana DEX volume tops rivals — SOL ecosystem momentum", "summary": "On-chain metrics show SOL DEX share gains; watch exchange deposit trends.", "source": "Messari", "category": "crypto", "impact": "medium", "symbols": ["SOL"], "modules": ["crypto"], "tags": ["defi"]},
    {"headline": "SEC crypto enforcement timeline in focus ahead of ruling", "summary": "Regulatory headline risk for altcoins; BTC/ETH relatively insulated.", "source": "Reuters", "category": "regulatory", "impact": "high", "symbols": ["BTC", "ETH"], "modules": ["crypto"], "tags": ["regulation"]},
    # Sports betting
    {"headline": "Chiefs QB limited in practice — injury report moves Bills line", "summary": "Vegas books adjust Chiefs @ Bills total and spread; sharp money on Buffalo early.", "source": "ESPN", "category": "sports", "impact": "high", "sports": ["football"], "matchups": ["Chiefs @ Bills"], "modules": ["betting"], "tags": ["injury", "nfl"]},
    {"headline": "Lakers list star questionable — Celtics line steams toward -6", "summary": "Late injury news historically moves NBA markets 1-2 points pre-tip.", "source": "Bleacher Report", "category": "sports", "impact": "high", "sports": ["basketball"], "matchups": ["Lakers @ Celtics"], "modules": ["betting"], "tags": ["injury", "nba"]},
    {"headline": "Yankees bullpen fatigue flagged ahead of Red Sox series", "summary": "Analytics models lean over in AL East matchups; weather clear in Boston.", "source": "MLB.com", "category": "sports", "impact": "medium", "sports": ["baseball"], "matchups": ["Yankees @ Red Sox"], "modules": ["betting"], "tags": ["mlb"]},
    {"headline": "Dodgers ace scratched — Padres run line value debated", "summary": "Starting pitcher change shifts model outputs +0.5 runs toward San Diego.", "source": "Action Network", "category": "sports", "impact": "high", "sports": ["baseball"], "matchups": ["Dodgers @ Padres"], "modules": ["betting"], "tags": ["mlb", "pitching"]},
    {"headline": "NHL weather: Buffalo snow alert — travel delays possible for Rangers", "summary": "Monitor game-day availability; outdoor-adjacent markets can see last-minute moves.", "source": "Weather.com", "category": "weather", "impact": "medium", "sports": ["hockey"], "matchups": ["Rangers @ Bruins"], "modules": ["betting"], "tags": ["weather", "nhl"]},
    {"headline": "Premier League: Arsenal injury update ahead of Man City clash", "summary": "Key midfielder returns to training — Asian handicap markets react.", "source": "BBC Sport", "category": "sports", "impact": "medium", "sports": ["soccer"], "matchups": ["Man City @ Arsenal"], "modules": ["betting"], "tags": ["epl"]},
    # Predictions / geopolitical
    {"headline": "Ukraine peace talks framework leaked — Polymarket odds jump", "summary": "Ceasefire contract reprices higher on diplomatic headline; verify source credibility.", "source": "Financial Times", "category": "geopolitical", "impact": "high", "markets": ["Ceasefire in Ukraine before Dec 2026?"], "modules": ["predictions"], "tags": ["war", "diplomacy"]},
    {"headline": "Middle East tensions escalate after naval incident — oil spikes", "summary": "Geopolitical risk premium rises; prediction markets on military action tick higher.", "source": "Al Jazeera", "category": "geopolitical", "impact": "high", "markets": ["US military action against Iran in 2026?"], "modules": ["predictions"], "tags": ["war", "oil"]},
    {"headline": "Celebrity engagement rumors swirl — social volume spikes", "summary": "Entertainment prediction markets see YES bids on marriage contracts.", "source": "TMZ", "category": "entertainment", "impact": "medium", "markets": ["Taylor Swift announces engagement in 2026?"], "modules": ["predictions"], "tags": ["celebrity"]},
    {"headline": "Fed chair speech hints at data-dependent path — rate cut bets shift", "summary": "July cut probability moves 5pts in Kalshi/Polymarket composite.", "source": "CNBC", "category": "economic", "impact": "high", "markets": ["Fed cuts rates 3+ times in 2026?"], "modules": ["predictions"], "tags": ["fed", "macro"]},
    {"headline": "BTC breaks key level — $150K by EOY contracts reprice", "summary": "Crypto event markets see YES flow after institutional commentary.", "source": "CoinTelegraph", "category": "crypto", "impact": "medium", "markets": ["BTC above $150K by end of 2026?"], "modules": ["predictions", "crypto"], "tags": ["bitcoin"]},
    {"headline": "OpenAI product roadmap speculation intensifies ahead of dev conference", "summary": "GPT-5 timing markets active; treat leaks as unverified.", "source": "TechCrunch", "category": "science", "impact": "medium", "markets": ["OpenAI releases GPT-5 before July 2026?"], "modules": ["predictions"], "tags": ["ai"]},
    {"headline": "Global PMI composite beats — risk assets bid", "summary": "Macro surprise supports equities and crypto beta; watch USD reaction.", "source": "Reuters", "category": "global", "impact": "medium", "symbols": [], "modules": ["trades", "crypto", "predictions"], "tags": ["macro", "global"]},
]


async def fetch_news(
    module: str,
    user_id: str = "demo",
    limit: int = 12,
) -> list[dict]:
    context = _user_context(user_id, module)
    now = datetime.now(timezone.utc)
    items: list[dict] = []

    for i, raw in enumerate(NEWS_CORPUS):
        if module not in raw.get("modules", []):
            continue
        score, reason = _score_relevance(raw, context, module)
        ts = (now - timedelta(hours=i * 3 + 1)).isoformat()
        items.append(
            {
                "id": f"news-{module}-{i}",
                "headline": raw["headline"],
                "summary": raw["summary"],
                "source": raw["source"],
                "category": raw["category"],
                "impact": raw["impact"],
                "tags": raw.get("tags", []),
                "timestamp": ts,
                "relevanceScore": score,
                "relevanceReason": reason,
                "affectsYou": score >= 70,
            }
        )

    rss = await _try_rss(context, module)
    items.extend(rss)

    items.sort(key=lambda x: x["relevanceScore"], reverse=True)
    return items[:limit]


async def fetch_news_for_analysis(module: str, user_id: str = "demo", limit: int = 5) -> list[dict]:
    """Top headlines for LLM enrichment."""
    return await fetch_news(module, user_id, limit=limit)


def _user_context(user_id: str, module: str) -> dict:
    ctx: dict = {"symbols": set(), "matchups": set(), "sports": set(), "markets": set()}
    if module in ("trades", "penny"):
        table = "stock_portfolios" if module == "trades" else "penny_portfolios"
        holdings = load_portfolio(table, user_id) or []
        ctx["symbols"] = {h["symbol"].upper() for h in holdings}
    elif module == "crypto":
        holdings = load_portfolio("crypto_portfolios", user_id) or []
        ctx["symbols"] = {h["symbol"].upper() for h in holdings}
    elif module == "betting":
        for b in list_bets(user_id):
            ctx["matchups"].add(b.get("matchup", ""))
            if b.get("sport"):
                ctx["sports"].add(b["sport"].lower())
    elif module == "predictions":
        for p in list_predictions(user_id):
            ctx["markets"].add(p.get("market", ""))
    return ctx


def _score_relevance(raw: dict, context: dict, module: str) -> tuple[int, str]:
    score = 40
    reason = "General market headline"

    sym_overlap = set(raw.get("symbols", [])) & context.get("symbols", set())
    if sym_overlap:
        score = 95
        reason = f"Directly affects your {', '.join(sorted(sym_overlap))} position(s)"

    matchup_overlap = set(raw.get("matchups", [])) & context.get("matchups", set())
    if matchup_overlap:
        score = max(score, 92)
        reason = f"Impacts your bet on {next(iter(matchup_overlap))}"

    market_overlap = set(raw.get("markets", [])) & context.get("markets", set())
    if market_overlap:
        score = max(score, 93)
        reason = f"Moves odds on your market: {next(iter(market_overlap))[:50]}…"

    if raw.get("impact") == "high" and score < 70:
        score += 15
        if reason == "General market headline":
            reason = "High-impact headline for this module"

    sport = raw.get("sports", [])
    if sport and context.get("sports") and set(sport) & context.get("sports", set()):
        score = max(score, 75)
        reason = f"Relevant to your {sport[0]} bets"

    if module == "betting" and raw.get("category") == "weather":
        score = max(score, 65)
        reason = "Weather can delay/postpone games — check your picks"

    return min(99, score), reason


async def _try_rss(context: dict, module: str) -> list[dict]:
    """Optional live headlines via Google News RSS (free, no key)."""
    query = _rss_query(context, module)
    if not query:
        return []
    try:
        import xml.etree.ElementTree as ET

        import httpx

        url = f"https://news.google.com/rss/search?q={query}&hl=en-US&gl=US&ceid=US:en"
        async with httpx.AsyncClient(timeout=8.0, follow_redirects=True) as client:
            resp = await client.get(url, headers={"User-Agent": "MotiveFX.AI/1.0"})
            if resp.status_code != 200:
                return []
            root = ET.fromstring(resp.text)
        items = []
        now = datetime.now(timezone.utc).isoformat()
        for item in root.findall(".//item")[:4]:
            title = item.findtext("title") or ""
            desc = item.findtext("description") or ""
            source = item.findtext("source") or "Google News"
            if not title:
                continue
            items.append(
                {
                    "id": f"rss-{hash(title) % 10**8}",
                    "headline": title[:200],
                    "summary": _strip_html(desc)[:300] or title,
                    "source": source,
                    "category": "live",
                    "impact": "medium",
                    "tags": ["live-feed"],
                    "timestamp": now,
                    "relevanceScore": 72,
                    "relevanceReason": "Live headline matched your portfolio/picks",
                    "affectsYou": True,
                }
            )
        return items
    except Exception:
        return []


def _rss_query(context: dict, module: str) -> str:
    syms = list(context.get("symbols", []))[:3]
    if syms:
        return "+".join(syms) + "+stock" if module in ("trades", "penny") else "+".join(syms) + "+crypto"
    matchups = list(context.get("matchups", []))[:1]
    if matchups and module == "betting":
        return matchups[0].replace(" @ ", "+").replace(" ", "+") + "+sports"
    markets = list(context.get("markets", []))[:1]
    if markets and module == "predictions":
        words = markets[0].split()[:4]
        return "+".join(words)
    defaults = {
        "trades": "stock+market+earnings",
        "penny": "penny+stocks",
        "crypto": "bitcoin+crypto",
        "betting": "NFL+NBA+sports+betting",
        "predictions": "geopolitics+polymarket",
    }
    return defaults.get(module, "finance")


def _strip_html(text: str) -> str:
    import re
    return re.sub(r"<[^>]+>", "", text or "").strip()
