const now = () => new Date().toISOString();

export function demoUnusualOptions() {
  return [
    {
      symbol: "NVDA",
      type: "call",
      strike: 950,
      expiry: "2026-07-18",
      volume: 12400,
      openInterest: 820,
      premium: 1840000,
      volOiRatio: 15.1,
      sentiment: "bullish",
      note: "Vol/OI 15.1x — block flow",
      timestamp: now(),
    },
    {
      symbol: "TSLA",
      type: "put",
      strike: 180,
      expiry: "2026-07-11",
      volume: 8900,
      openInterest: 2100,
      premium: 620000,
      volOiRatio: 4.2,
      sentiment: "bearish",
      note: "Vol/OI 4.2x — defensive flow",
      timestamp: now(),
    },
    {
      symbol: "AAPL",
      type: "call",
      strike: 210,
      expiry: "2026-07-18",
      volume: 15200,
      openInterest: 4800,
      premium: 980000,
      volOiRatio: 3.2,
      sentiment: "bullish",
      note: "Vol/OI 3.2x — unusual activity",
      timestamp: now(),
    },
  ];
}

export function scanUnusualOptions() {
  return demoUnusualOptions();
}

export function demoPennyMovers() {
  return [
    { symbol: "SNDL", price: 0.42, changePct: 12.4, volume: 48200000, volRatio: 4.2, sentiment: "bullish", note: "Vol 4.2x avg — breakout on cannabis sector news", timestamp: now() },
    { symbol: "AMC", price: 4.85, changePct: 8.1, volume: 22100000, volRatio: 3.1, sentiment: "bullish", note: "Vol 3.1x avg — meme momentum returning", timestamp: now() },
    { symbol: "OPEN", price: 2.15, changePct: 9.6, volume: 18400000, volRatio: 3.4, sentiment: "bullish", note: "Vol 3.4x avg — housing beta play active", timestamp: now() },
    { symbol: "BBAI", price: 1.82, changePct: 14.2, volume: 31200000, volRatio: 5.1, sentiment: "bullish", note: "Vol 5.1x avg — AI penny momentum", timestamp: now() },
    { symbol: "BNGO", price: 1.24, changePct: 15.3, volume: 12300000, volRatio: 3.9, sentiment: "bullish", note: "Vol 3.9x avg — biotech catalyst watch", timestamp: now() },
  ];
}

export function scanPennyMovers() {
  return demoPennyMovers();
}

export function scanVolumeSpikes() {
  return demoPennyMovers().filter((m) => (m.volRatio ?? 0) >= 2);
}

export function demoWhaleAlerts() {
  return [
    { asset: "BTC", amountUsd: 42000000, from: "unknown wallet", to: "Coinbase", direction: "deposit", note: "Exchange inflow", timestamp: now() },
    { asset: "ETH", amountUsd: 18500000, from: "whale 0x7a…", to: "Binance", direction: "deposit", note: "Large transfer flagged", timestamp: now() },
  ];
}

export async function fetchWhaleAlerts() {
  const key = process.env.COINSTATS_API_KEY?.trim();
  if (!key) return demoWhaleAlerts();
  try {
    const res = await fetch("https://openapiv1.coinstats.app/whale/transactions", {
      headers: { "X-API-KEY": key },
      next: { revalidate: 60 },
    });
    if (!res.ok) return demoWhaleAlerts();
    const raw = (await res.json()) as { result?: Array<Record<string, unknown>> } | Array<Record<string, unknown>>;
    const rows = Array.isArray(raw) ? raw : raw.result ?? [];
    const items = rows.slice(0, 20).map((r) => ({
      asset: String(r.coin ?? "—"),
      amountUsd: r.amountUsd as number | undefined,
      from: String(r.from ?? "unknown wallet"),
      to: String(r.to ?? "exchange"),
      direction: String(r.direction ?? "deposit"),
      note: String(r.note ?? r.direction ?? "exchange flow"),
      timestamp: r.timestamp as string | undefined,
    }));
    return items.length ? items : demoWhaleAlerts();
  } catch {
    return demoWhaleAlerts();
  }
}

export function demoLineMoves() {
  return [
    { matchup: "Chiefs @ Bills", sport: "NFL", commenceTime: "2026-09-07T20:20:00Z", openingLine: "KC -2.5", currentLine: "KC -4.5", movement: "-2.0", direction: "sharp_on_home", book: "Pinnacle", timestamp: now() },
    { matchup: "Lakers @ Celtics", sport: "NBA", commenceTime: "2026-06-28T00:30:00Z", openingLine: "BOS -6.5", currentLine: "BOS -4.0", movement: "+2.5", direction: "public_on_home", book: "DraftKings", timestamp: now() },
    { matchup: "Yankees @ Red Sox", sport: "MLB", commenceTime: "2026-06-27T23:10:00Z", openingLine: "NYY -1.5", currentLine: "NYY -2.5", movement: "-1.0", direction: "sharp_on_away", book: "FanDuel", timestamp: now() },
  ];
}

export async function fetchLineMoves(sport = "americanfootball_nfl") {
  const key = process.env.THE_ODDS_API_KEY?.trim();
  if (!key) return demoLineMoves();
  try {
    const url = new URL(`https://api.the-odds-api.com/v4/sports/${sport}/odds`);
    url.searchParams.set("apiKey", key);
    url.searchParams.set("regions", "us");
    url.searchParams.set("markets", "h2h,spreads");
    url.searchParams.set("oddsFormat", "american");
    const res = await fetch(url, { next: { revalidate: 120 } });
    if (!res.ok) return demoLineMoves();
    const games = (await res.json()) as Array<Record<string, unknown>>;
    const items = games.slice(0, 12).map((game) => {
      const home = String(game.home_team ?? "Home");
      const away = String(game.away_team ?? "Away");
      const bookmakers = (game.bookmakers as Array<Record<string, unknown>>) ?? [];
      const market = ((bookmakers[0]?.markets as Array<Record<string, unknown>>) ?? [{}])[0];
      const outcomes = Object.fromEntries(
        ((market.outcomes as Array<{ name: string; price?: number }>) ?? []).map((o) => [o.name, o.price])
      );
      return {
        matchup: `${away} @ ${home}`,
        sport: String(game.sport_title ?? "—"),
        commenceTime: game.commence_time,
        line: outcomes,
        book: bookmakers[0]?.title,
      };
    });
    return items.length ? items : demoLineMoves();
  } catch {
    return demoLineMoves();
  }
}

export function demoSharpAction() {
  return [
    { matchup: "Chiefs @ Bills", publicPct: 78, moneyPct: 32, sharpSide: "Bills +4.5", signal: "reverse_line_move", confidence: "high" },
    { matchup: "Lakers @ Celtics", publicPct: 65, moneyPct: 71, sharpSide: "Celtics -4", signal: "aligned_sharp", confidence: "medium" },
    { matchup: "Dodgers @ Padres", publicPct: 82, moneyPct: 45, sharpSide: "Padres +1.5", signal: "fade_public", confidence: "high" },
  ];
}

export async function fetchSharpAction() {
  return demoSharpAction();
}

export function demoPredictionMarkets() {
  return [
    { market: "Fed rate cut in July 2026", platform: "Polymarket", yes: 0.62, no: 0.38, volume24h: "$2.1M", category: "economy", categoryLabel: "Economy & Fed" },
    { market: "Ceasefire in Ukraine before Dec 2026?", platform: "Polymarket", yes: 0.34, no: 0.66, volume24h: "$890K", category: "geopolitics", categoryLabel: "Geopolitics & War" },
    { market: "Taylor Swift announces engagement in 2026?", platform: "Polymarket", yes: 0.41, no: 0.59, volume24h: "$420K", category: "entertainment", categoryLabel: "Celebrity & Culture" },
  ];
}

export async function fetchPredictionMarkets(limit = 20) {
  try {
    const url = new URL("https://gamma-api.polymarket.com/events");
    url.searchParams.set("active", "true");
    url.searchParams.set("closed", "false");
    url.searchParams.set("limit", String(limit));
    url.searchParams.set("order", "volume24hr");
    const res = await fetch(url, { next: { revalidate: 120 } });
    if (!res.ok) return demoPredictionMarkets().slice(0, limit);
    const events = (await res.json()) as Array<Record<string, unknown>>;
    const items = events.slice(0, limit).flatMap((ev) => {
      const markets = (ev.markets as Array<Record<string, unknown>>) ?? [];
      if (!markets.length) return [];
      const m = markets[0];
      let yes = 0.5;
      try {
        const prices = JSON.parse(String(m.outcomePrices ?? "[]")) as number[];
        yes = prices[0] ?? 0.5;
      } catch {
        /* ok */
      }
      return [{
        market: String(ev.title ?? m.question ?? "—"),
        platform: "Polymarket",
        yes,
        no: Math.round((1 - yes) * 1000) / 1000,
        volume24h: `$${Number(ev.volume24hr ?? 0).toLocaleString()}`,
        category: "economy",
        categoryLabel: "Economy & Fed",
      }];
    });
    return items.length ? items : demoPredictionMarkets().slice(0, limit);
  } catch {
    return demoPredictionMarkets().slice(0, limit);
  }
}

export function demoCongressTrades() {
  return [
    { politician: "Sen. Smith", symbol: "NVDA", transaction: "Purchase", amount: "$15,001 - $50,000", date: "2026-06-20" },
    { politician: "Rep. Jones", symbol: "MSFT", transaction: "Sale", amount: "$1,001 - $15,000", date: "2026-06-18" },
  ];
}

export async function fetchCongressTrades(limit = 10) {
  return demoCongressTrades().slice(0, limit);
}

export const PREDICTION_CATEGORIES = [
  { id: "geopolitics", label: "Geopolitics & War" },
  { id: "politics", label: "Politics & Elections" },
  { id: "entertainment", label: "Celebrity & Culture" },
  { id: "economy", label: "Economy & Fed" },
  { id: "science", label: "Science & Tech" },
  { id: "crypto", label: "Crypto Events" },
];
