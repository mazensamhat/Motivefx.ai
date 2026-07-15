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
    { asset: "BTC", amountUsd: 42000000, from: "bc1q…whale", to: "Coinbase", direction: "deposit", note: "Exchange inflow — $42M", timestamp: now() },
    { asset: "ETH", amountUsd: 18500000, from: "0x7a…whale", to: "Binance", direction: "deposit", note: "Large transfer flagged", timestamp: now() },
    { asset: "SOL", amountUsd: 9200000, from: "Binance", to: "0x9f…cold", direction: "withdrawal", note: "Exchange outflow", timestamp: now() },
    { asset: "BTC", amountUsd: 67000000, from: "Kraken", to: "bc1q…custody", direction: "withdrawal", note: "Cold storage move", timestamp: now() },
  ];
}

type CoinGeckoMarket = {
  symbol?: string;
  name?: string;
  current_price?: number;
  total_volume?: number;
  price_change_percentage_24h?: number;
};

async function fetchCoinGeckoWhaleLike() {
  try {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=volume_desc&per_page=15&page=1&sparkline=false",
      { next: { revalidate: 120 } }
    );
    if (!res.ok) return [];
    const rows = (await res.json()) as CoinGeckoMarket[];
    return rows
      .filter((r) => (r.total_volume ?? 0) >= 5_000_000)
      .map((r) => {
        const amountUsd = Math.round(r.total_volume ?? 0);
        const bullish = (r.price_change_percentage_24h ?? 0) >= 0;
        return {
          asset: String(r.symbol ?? "").toUpperCase(),
          amountUsd,
          from: bullish ? "Market buyers" : "Exchange reserves",
          to: bullish ? "Exchange / spot" : "Market sellers",
          direction: bullish ? "deposit" : "withdrawal",
          note: `${r.name ?? r.symbol} · 24h vol $${(amountUsd / 1_000_000).toFixed(1)}M`,
          price: r.current_price,
          timestamp: now(),
        };
      });
  } catch {
    return [];
  }
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<null>((resolve) => {
        timer = setTimeout(() => resolve(null), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function fetchWhaleAlerts() {
  const key = process.env.COINSTATS_API_KEY?.trim();
  const demo = demoWhaleAlerts();

  /* Cap total wait so activity panels never sit empty on CoinGecko cold starts. */
  const live = (async () => {
    const gecko = await withTimeout(fetchCoinGeckoWhaleLike(), 2200);
    if (gecko?.length) return gecko;

    if (!key) return demo;

    try {
      const res = await withTimeout(
        fetch("https://openapiv1.coinstats.app/coins?limit=12", {
          headers: { "X-API-KEY": key },
          next: { revalidate: 120 },
        }),
        2000
      );
      if (res?.ok) {
        const raw = (await res.json()) as { result?: Array<Record<string, unknown>> } | Array<Record<string, unknown>>;
        const rows = Array.isArray(raw) ? raw : raw.result ?? [];
        const items = rows.slice(0, 12).map((r) => {
          const amountUsd = Number(r.volume ?? r.marketCap ?? 0);
          const change = Number(r.priceChange1d ?? 0);
          const bullish = change >= 0;
          return {
            asset: String(r.symbol ?? r.coin ?? "—").toUpperCase(),
            amountUsd,
            from: bullish ? "Spot buyers" : "Exchange flow",
            to: bullish ? "Market" : "Distribution",
            direction: bullish ? "deposit" : "withdrawal",
            note: String(r.name ?? r.symbol ?? "Market flow"),
            price: Number(r.price ?? 0) || undefined,
            timestamp: now(),
          };
        });
        if (items.length) return items;
      }
    } catch {
      /* fall through */
    }
    return demo;
  })();

  const raced = await withTimeout(live, 2800);
  return raced?.length ? raced : demo;
}

export type FeedMeta = {
  source: "live" | "demo";
  updatedAt: string;
  error?: string;
};

export type LineMoveItem = {
  matchup: string;
  sport: string;
  /** Odds API sport_key when available (e.g. baseball_mlb). */
  sportKey?: string;
  commenceTime?: unknown;
  openingLine?: string;
  currentLine?: string;
  movement?: string;
  direction?: string;
  book?: unknown;
  line?: Record<string, number | undefined>;
  timestamp?: string;
};

export type SharpActionItem = {
  matchup: string;
  publicPct: number;
  moneyPct: number;
  sharpSide: string;
  signal: string;
  confidence: string;
};

export type PredictionMarketItem = {
  market: string;
  platform: string;
  yes: number;
  no: number;
  volume24h: string;
  category: string;
  categoryLabel: string;
  slug?: string;
  timestamp?: string;
};

export function demoLineMoves(): LineMoveItem[] {
  return [
    { matchup: "Chiefs @ Bills", sport: "NFL", commenceTime: "2026-09-07T20:20:00Z", openingLine: "KC -2.5", currentLine: "KC -4.5", movement: "-2.0", direction: "sharp_on_home", book: "Pinnacle", timestamp: now() },
    { matchup: "Lakers @ Celtics", sport: "NBA", commenceTime: "2026-06-28T00:30:00Z", openingLine: "BOS -6.5", currentLine: "BOS -4.0", movement: "+2.5", direction: "public_on_home", book: "DraftKings", timestamp: now() },
    { matchup: "Yankees @ Red Sox", sport: "MLB", commenceTime: "2026-06-27T23:10:00Z", openingLine: "NYY -1.5", currentLine: "NYY -2.5", movement: "-1.0", direction: "sharp_on_away", book: "FanDuel", timestamp: now() },
  ];
}

/**
 * US major leagues first (in-season coverage), then seasonal.
 * `upcoming` is still tried early (1 quota unit) but results are re-ranked so
 * NPB/KBO/etc. cannot flood the list when MLB/MLS/WNBA/NBA are available.
 */
const ODDS_SPORT_FALLBACKS = [
  "upcoming",
  "baseball_mlb",
  "soccer_usa_mls",
  "basketball_wnba",
  "basketball_nba",
  "mma_mixed_martial_arts",
  "americanfootball_nfl",
  "icehockey_nhl",
];

/** Prefer these Odds API sport_keys when diversifying the line board. */
const PREFERRED_SPORT_KEYS = new Set([
  "baseball_mlb",
  "soccer_usa_mls",
  "basketball_nba",
  "basketball_wnba",
  "basketball_ncaab",
  "americanfootball_nfl",
  "americanfootball_ncaaf",
  "icehockey_nhl",
  "mma_mixed_martial_arts",
  "boxing_boxing",
]);

const LINE_MOVE_LIMIT = 12;
/** Max non-preferred (e.g. NPB) rows when we already have preferred coverage. */
const SECONDARY_SPORT_CAP = 2;
/** Stop fetching more sports once we have this many preferred games. */
const PREFERRED_COVERAGE_TARGET = 6;

type OddsOutcome = { name: string; price?: number; point?: number };

function formatOddsLine(outcomes: OddsOutcome[], home: string): string | undefined {
  const homeOut = outcomes.find((o) => o.name === home);
  const primary = homeOut ?? outcomes[0];
  if (!primary) return undefined;
  const short = primary.name.split(" ").pop() ?? primary.name;
  if (primary.point != null) {
    return `${short} ${primary.point > 0 ? "+" : ""}${primary.point}`;
  }
  if (primary.price != null) {
    const price = primary.price > 0 ? `+${primary.price}` : String(primary.price);
    return `${short} ${price}`;
  }
  return short;
}

function sportKeyPriority(sportKey: string): number {
  const key = sportKey.trim().toLowerCase();
  if (!key) return 2;
  if (PREFERRED_SPORT_KEYS.has(key)) return 0;
  // Other soccer after MLS; still ahead of NPB/KBO flood.
  if (key.startsWith("soccer_")) return 1;
  if (key.includes("nba") || key.includes("wnba")) return 0;
  return 2;
}

function isPreferredLine(item: LineMoveItem): boolean {
  return sportKeyPriority(item.sportKey ?? "") <= 1;
}

function mapOddsGames(games: Array<Record<string, unknown>>): LineMoveItem[] {
  return games.map((game) => {
    const home = String(game.home_team ?? "Home");
    const away = String(game.away_team ?? "Away");
    const bookmakers = (game.bookmakers as Array<Record<string, unknown>>) ?? [];
    const markets = (bookmakers[0]?.markets as Array<Record<string, unknown>>) ?? [];
    const preferred =
      markets.find((m) => m.key === "spreads") ??
      markets.find((m) => m.key === "h2h") ??
      markets[0] ??
      {};
    const outcomes = (preferred.outcomes as OddsOutcome[]) ?? [];
    const currentLine = formatOddsLine(outcomes, home);
    const sportKey = String(game.sport_key ?? "");
    return {
      matchup: `${away} @ ${home}`,
      sport: String(game.sport_title ?? "—"),
      sportKey,
      commenceTime: game.commence_time,
      openingLine: currentLine,
      currentLine,
      movement: "—",
      direction: "live",
      book: bookmakers[0]?.title,
      line: Object.fromEntries(outcomes.map((o) => [o.name, o.price])),
      timestamp: now(),
    };
  });
}

function mergeLineMoves(existing: LineMoveItem[], incoming: LineMoveItem[]): LineMoveItem[] {
  const seen = new Set(existing.map((i) => i.matchup.toLowerCase()));
  const merged = [...existing];
  for (const item of incoming) {
    const key = item.matchup.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(item);
  }
  return merged;
}

/** Prefer US majors; allow a small NPB/etc. tail only when preferred coverage exists (or as last resort). */
function diversifyLineMoves(items: LineMoveItem[]): LineMoveItem[] {
  const preferred = items
    .filter(isPreferredLine)
    .sort((a, b) => sportKeyPriority(a.sportKey ?? "") - sportKeyPriority(b.sportKey ?? ""));
  const secondary = items.filter((i) => !isPreferredLine(i));

  if (preferred.length === 0) {
    // Nothing preferred live — still show whatever is available (e.g. NPB-only window).
    return secondary.slice(0, LINE_MOVE_LIMIT);
  }

  const secondaryCap = preferred.length >= 3 ? SECONDARY_SPORT_CAP : Math.min(4, SECONDARY_SPORT_CAP + 2);
  return [...preferred, ...secondary.slice(0, secondaryCap)].slice(0, LINE_MOVE_LIMIT);
}

function preferredCoverageCount(items: LineMoveItem[]): number {
  return items.filter(isPreferredLine).length;
}

type OddsSportResult =
  | { ok: true; items: LineMoveItem[] }
  | { ok: false; status: number; message: string; fatal: boolean };

function formatOddsHttpError(status: number, bodyText: string): string {
  let detail = bodyText.trim();
  try {
    const parsed = JSON.parse(bodyText) as { message?: string; error_code?: string };
    if (parsed.message) detail = parsed.message;
    else if (parsed.error_code) detail = parsed.error_code;
  } catch {
    /* keep raw body */
  }
  if (status === 401) {
    return `The Odds API unauthorized (${detail || "HTTP 401"}) — check API key or usage credits.`;
  }
  if (status === 403) {
    return `The Odds API forbidden (${detail || "HTTP 403"}).`;
  }
  if (status === 429) {
    return `The Odds API rate limited (${detail || "HTTP 429"}) — try again shortly.`;
  }
  return `The Odds API error HTTP ${status}${detail ? `: ${detail}` : ""}.`;
}

async function fetchOddsForSport(sport: string, key: string): Promise<OddsSportResult> {
  const url = new URL(`https://api.the-odds-api.com/v4/sports/${sport}/odds`);
  url.searchParams.set("apiKey", key);
  url.searchParams.set("regions", "us");
  // Single market = 1 quota unit per call; spreads+h2h was burning 2× per sport in the fallback loop.
  url.searchParams.set("markets", "h2h");
  url.searchParams.set("oddsFormat", "american");
  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) {
    const bodyText = await res.text().catch(() => "");
    const fatal = res.status === 401 || res.status === 403 || res.status === 429;
    return {
      ok: false,
      status: res.status,
      message: formatOddsHttpError(res.status, bodyText),
      fatal,
    };
  }
  const games = (await res.json()) as Array<Record<string, unknown>>;
  return { ok: true, items: mapOddsGames(Array.isArray(games) ? games : []) };
}

export async function fetchLineMoves(sport = "baseball_mlb"): Promise<LineMoveItem[]> {
  const result = await fetchLineMovesWithMeta(sport);
  return result.items;
}

export async function fetchLineMovesWithMeta(
  sport = "baseball_mlb"
): Promise<{ items: LineMoveItem[] } & FeedMeta> {
  const updatedAt = now();
  const key = process.env.THE_ODDS_API_KEY?.trim();
  if (!key) {
    return {
      items: demoLineMoves(),
      source: "demo",
      updatedAt,
      error: "THE_ODDS_API_KEY not configured — showing sample lines.",
    };
  }

  const sports = [
    "upcoming",
    sport,
    ...ODDS_SPORT_FALLBACKS.filter((s) => s !== sport && s !== "upcoming"),
  ];
  const seen = new Set<string>();
  const emptySports: string[] = [];
  const softErrors: string[] = [];
  let collected: LineMoveItem[] = [];

  try {
    for (const s of sports) {
      if (seen.has(s)) continue;
      seen.add(s);
      try {
        const result = await fetchOddsForSport(s, key);
        if (result.ok) {
          if (result.items.length) {
            collected = mergeLineMoves(collected, result.items);
            const diversified = diversifyLineMoves(collected);
            const preferredCount = preferredCoverageCount(diversified);
            // After upcoming: only stop early when preferred majors are present.
            // Otherwise keep fetching MLB/MLS/WNBA so NPB cannot dominate.
            const enoughPreferred = preferredCount >= PREFERRED_COVERAGE_TARGET;
            const enoughMixed =
              s !== "upcoming" && diversified.length >= 8 && preferredCount >= 3;
            if (enoughPreferred || enoughMixed) {
              return { items: diversified, source: "live", updatedAt };
            }
            continue;
          }
          emptySports.push(s);
          continue;
        }
        softErrors.push(`${s}: ${result.message}`);
        // Auth / quota / rate-limit: stop immediately — further calls waste credits and still fail.
        if (result.fatal) {
          if (collected.length) {
            return {
              items: diversifyLineMoves(collected),
              source: "live",
              updatedAt,
              error: result.message,
            };
          }
          return {
            items: [],
            source: "demo",
            updatedAt,
            error: result.message,
          };
        }
      } catch (err) {
        softErrors.push(`${s}: ${err instanceof Error ? err.message : "failed"}`);
      }
    }
    if (collected.length) {
      return { items: diversifyLineMoves(collected), source: "live", updatedAt };
    }
    return {
      items: demoLineMoves(),
      source: "demo",
      updatedAt,
      error:
        softErrors[0] ||
        (emptySports.length
          ? `No live games from The Odds API (${emptySports.slice(0, 4).join(", ")}${emptySports.length > 4 ? "…" : ""}) — showing sample lines.`
          : "No live games from The Odds API — showing sample lines."),
    };
  } catch (err) {
    return {
      items: demoLineMoves(),
      source: "demo",
      updatedAt,
      error: err instanceof Error ? err.message : "Odds feed unavailable — showing sample lines.",
    };
  }
}

/** Legacy demo rows — kept for reference/tests only; never served to the Bets UI. */
export function demoSharpAction(): SharpActionItem[] {
  return [
    { matchup: "Chiefs @ Bills", publicPct: 78, moneyPct: 32, sharpSide: "Bills +4.5", signal: "reverse_line_move", confidence: "high" },
    { matchup: "Lakers @ Celtics", publicPct: 65, moneyPct: 71, sharpSide: "Celtics -4", signal: "aligned_sharp", confidence: "medium" },
    { matchup: "Dodgers @ Padres", publicPct: 82, moneyPct: 45, sharpSide: "Padres +1.5", signal: "fade_public", confidence: "high" },
  ];
}

export const SHARP_MONEY_UNAVAILABLE_MESSAGE =
  "Sharp money model unavailable — public vs sharp ticket splits need a dedicated consensus feed.";

export async function fetchSharpActionWithMeta(): Promise<{ items: SharpActionItem[] } & FeedMeta> {
  // Honesty over fake July NFL/NBA slips: we do not have a live public/sharp split vendor.
  return {
    items: [],
    source: "demo",
    updatedAt: now(),
    error: SHARP_MONEY_UNAVAILABLE_MESSAGE,
  };
}

export async function fetchSharpAction(): Promise<SharpActionItem[]> {
  const result = await fetchSharpActionWithMeta();
  return result.items;
}

export function demoPredictionMarkets(): PredictionMarketItem[] {
  return [
    { market: "Fed rate cut in July 2026", platform: "Polymarket", yes: 0.62, no: 0.38, volume24h: "$2.1M", category: "economy", categoryLabel: "Economy & Fed", timestamp: now() },
    { market: "Ceasefire in Ukraine before Dec 2026?", platform: "Polymarket", yes: 0.34, no: 0.66, volume24h: "$890K", category: "geopolitics", categoryLabel: "Geopolitics & War", timestamp: now() },
    { market: "Taylor Swift announces engagement in 2026?", platform: "Polymarket", yes: 0.41, no: 0.59, volume24h: "$420K", category: "entertainment", categoryLabel: "Celebrity & Culture", timestamp: now() },
  ];
}

function categorizePolymarketTags(tags: Array<{ label?: string; slug?: string }> | undefined): {
  category: string;
  categoryLabel: string;
} {
  const blob = (tags ?? [])
    .map((t) => `${t.label ?? ""} ${t.slug ?? ""}`.toLowerCase())
    .join(" ");
  if (/war|geopolit|ukraine|israel|gaza|military|ceasefire/.test(blob)) {
    return { category: "geopolitics", categoryLabel: "Geopolitics & War" };
  }
  if (/politic|election|president|senate|trump|biden|macron|parliament/.test(blob)) {
    return { category: "politics", categoryLabel: "Politics & Elections" };
  }
  if (/celebrity|culture|music|movie|sports|nba|nfl|soccer|football/.test(blob)) {
    return { category: "entertainment", categoryLabel: "Celebrity & Culture" };
  }
  if (/crypto|bitcoin|ethereum|ipo|token/.test(blob)) {
    return { category: "crypto", categoryLabel: "Crypto Events" };
  }
  if (/fed|economy|rate|inflation|gdp|jobs|finance|business/.test(blob)) {
    return { category: "economy", categoryLabel: "Economy & Fed" };
  }
  if (/science|tech|ai|space|nasa/.test(blob)) {
    return { category: "science", categoryLabel: "Science & Tech" };
  }
  return { category: "politics", categoryLabel: "Politics & Elections" };
}

function parseOutcomeYes(raw: unknown): number {
  try {
    const prices = typeof raw === "string" ? (JSON.parse(raw) as unknown) : raw;
    if (Array.isArray(prices) && prices.length) {
      const n = Number(prices[0]);
      return Number.isFinite(n) ? n : 0.5;
    }
  } catch {
    /* ok */
  }
  return 0.5;
}

function isOpenChildMarket(m: Record<string, unknown>): boolean {
  if (m.closed === true || m.archived === true) return false;
  if (m.active === false) return false;
  if (m.acceptingOrders === false) return false;
  return true;
}

function pickOpenMarket(markets: Array<Record<string, unknown>>): Record<string, unknown> | null {
  const open = markets.filter(isOpenChildMarket);
  if (!open.length) return null;
  open.sort((a, b) => Number(b.volume24hr ?? 0) - Number(a.volume24hr ?? 0));
  return open[0] ?? null;
}

function formatUsdVolume(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "$0";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${Math.round(n)}`;
}

export async function fetchPredictionMarkets(limit = 20): Promise<PredictionMarketItem[]> {
  const result = await fetchPredictionMarketsWithMeta(limit);
  return result.items;
}

export async function fetchPredictionMarketsWithMeta(
  limit = 20
): Promise<{ items: PredictionMarketItem[] } & FeedMeta> {
  const updatedAt = now();
  try {
    const url = new URL("https://gamma-api.polymarket.com/events");
    url.searchParams.set("active", "true");
    url.searchParams.set("closed", "false");
    /* Over-fetch: many “active” events only have closed child markets. */
    url.searchParams.set("limit", String(Math.min(Math.max(limit * 4, 40), 100)));
    url.searchParams.set("order", "volume_24hr");
    url.searchParams.set("ascending", "false");
    const res = await fetch(url.toString(), { cache: "no-store" });
    if (!res.ok) {
      return {
        items: demoPredictionMarkets().slice(0, limit),
        source: "demo",
        updatedAt,
        error: `Polymarket Gamma HTTP ${res.status} — showing sample markets.`,
      };
    }
    const events = (await res.json()) as Array<Record<string, unknown>>;
    const items: PredictionMarketItem[] = [];
    for (const ev of events) {
      if (ev.closed === true || ev.archived === true) continue;
      const markets = (ev.markets as Array<Record<string, unknown>>) ?? [];
      const m = pickOpenMarket(markets);
      if (!m) continue;
      const yes = parseOutcomeYes(m.outcomePrices);
      const vol = Number(m.volume24hr ?? ev.volume24hr ?? 0);
      const cats = categorizePolymarketTags(ev.tags as Array<{ label?: string; slug?: string }>);
      const question = String(m.question ?? ev.title ?? "—");
      items.push({
        market: question,
        platform: "Polymarket",
        yes,
        no: Math.round((1 - yes) * 1000) / 1000,
        volume24h: formatUsdVolume(vol),
        category: cats.category,
        categoryLabel: cats.categoryLabel,
        slug: String(m.slug ?? ev.slug ?? ""),
        timestamp: updatedAt,
      });
      if (items.length >= limit) break;
    }
    if (!items.length) {
      return {
        items: demoPredictionMarkets().slice(0, limit),
        source: "demo",
        updatedAt,
        error: "No open Polymarket markets in feed — showing sample markets.",
      };
    }
    return { items, source: "live", updatedAt };
  } catch (err) {
    return {
      items: demoPredictionMarkets().slice(0, limit),
      source: "demo",
      updatedAt,
      error: err instanceof Error ? err.message : "Polymarket unavailable — showing sample markets.",
    };
  }
}

export function demoCongressTrades() {
  return [
    { politician: "Sen. Smith", symbol: "NVDA", transaction: "Purchase", amount: "$15,001 - $50,000", filedAt: "2026-06-20", date: "2026-06-20" },
    { politician: "Rep. Jones", symbol: "MSFT", transaction: "Sale", amount: "$1,001 - $15,000", filedAt: "2026-06-18", date: "2026-06-18" },
    { politician: "Sen. Warren", symbol: "AAPL", transaction: "Purchase", amount: "$50,001 - $100,000", filedAt: "2026-06-15", date: "2026-06-15" },
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

/* Keep Finnhub fan-out small — 10 parallel calls made activity panels feel stuck. */
const STOCK_SCAN_SYMBOLS = ["NVDA", "TSLA", "AAPL", "MSFT", "AMD"];

type InsiderRow = {
  name?: string;
  share?: number;
  change?: number;
  filingDate?: string;
  transactionDate?: string;
  transactionCode?: string;
  transactionPrice?: number;
};

async function fetchFinnhubInsider(symbol: string, apiKey: string) {
  const res = await withTimeout(
    fetch(
      `https://finnhub.io/api/v1/stock/insider-transactions?symbol=${encodeURIComponent(symbol)}&token=${encodeURIComponent(apiKey)}`,
      { next: { revalidate: 300 } }
    ),
    3000
  );
  if (!res?.ok) return [];
  const data = (await res.json()) as { data?: InsiderRow[] };
  return data.data ?? [];
}

function mapOptionsToActivity(
  options: ReturnType<typeof scanUnusualOptions>,
  startId = 0
) {
  return options.map((o, i) => {
    const shares = Number(o.volume ?? 0);
    const price = Math.max(0.01, Math.round(Number(o.premium ?? 0) / Math.max(shares, 1)));
    const amountUsd = Number(o.premium ?? shares * price);
    const side = o.type === "put" || o.sentiment === "bearish" ? "sell" : "buy";
    return {
      id: `opt-${startId + i}`,
      symbol: o.symbol,
      actor: "Options block desk",
      actorType: "institutional",
      side,
      shares,
      amountUsd,
      price,
      timestamp: o.timestamp ?? now(),
      note: o.note ?? `${o.type?.toUpperCase()} flow · Vol/OI ${o.volOiRatio ?? "—"}x`,
    };
  });
}

function mapInsiderToActivity(rows: InsiderRow[], symbol: string, startId = 0) {
  return rows.slice(0, 8).map((r, i) => {
    const shares = Math.abs(Number(r.change ?? r.share ?? 0));
    const price = Number(r.transactionPrice ?? 0) || 100;
    const code = String(r.transactionCode ?? "").toUpperCase();
    const side = code === "S" || code === "D" ? "sell" : "buy";
    const amountUsd = Math.round(shares * price);
    return {
      id: `ins-${symbol}-${startId + i}`,
      symbol,
      actor: String(r.name ?? "Insider"),
      actorType: "insider",
      side,
      shares,
      amountUsd,
      price,
      timestamp: r.transactionDate ?? r.filingDate ?? now(),
      note: `Form 4 · ${code || "trade"} filing`,
    };
  });
}

export async function fetchStockActivity() {
  const finnhubKey = process.env.FINNHUB_API_KEY?.trim();
  /* Seed with demo options so the panel never waits on Finnhub cold starts. */
  const items: ReturnType<typeof mapOptionsToActivity> = [
    ...mapOptionsToActivity(scanUnusualOptions()),
  ];

  if (finnhubKey) {
    const batches = await withTimeout(
      Promise.all(STOCK_SCAN_SYMBOLS.map((sym) => fetchFinnhubInsider(sym, finnhubKey))),
      3200
    );
    batches?.forEach((rows, idx) => {
      if (rows.length) {
        items.push(...mapInsiderToActivity(rows, STOCK_SCAN_SYMBOLS[idx]!, items.length));
      }
    });
  }

  return items
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 40);
}

function mapPennyMoverToActivity(
  movers: ReturnType<typeof scanPennyMovers>,
  startId = 0
) {
  return movers.map((m, i) => {
    const shares = Math.round(Number(m.volume ?? 0));
    const amountUsd = Math.round(shares * Number(m.price ?? 0));
    const side = m.sentiment === "bearish" ? "sell" : "buy";
    const actor =
      (m.volRatio ?? 0) >= 4
        ? "Aggressive retail flow"
        : (m.volRatio ?? 0) >= 2.5
          ? "Momentum desk"
          : "Microcap scanner";
    return {
      id: `penny-${startId + i}`,
      symbol: m.symbol,
      actor,
      actorType: "flow",
      side,
      shares,
      amountUsd,
      price: m.price,
      timestamp: m.timestamp ?? now(),
      note: m.note ?? `Vol ${m.volRatio ?? "—"}x avg · ${m.changePct ?? 0}%`,
    };
  });
}

export async function fetchPennyActivity() {
  return mapPennyMoverToActivity(scanPennyMovers());
}

export async function fetchCryptoActivity() {
  const whales = await fetchWhaleAlerts();
  return whales.slice(0, 40).map((w, i) => {
    const amountUsd = Number(w.amountUsd ?? 0);
    const price = Number((w as { price?: number }).price ?? 0) || undefined;
    const amountCrypto = price && price > 0 ? amountUsd / price : amountUsd / 50_000;
    const side = String(w.direction ?? "").includes("withdraw") ? "sell" : "buy";
    return {
      id: `whale-${i}`,
      symbol: String(w.asset ?? "—").toUpperCase(),
      side,
      price,
      amountUsd,
      amountCrypto,
      from: String(w.from ?? "unknown wallet"),
      to: String(w.to ?? "exchange"),
      venue: String(w.to ?? "exchange").includes("Binance")
        ? "Binance"
        : String(w.to ?? "").includes("Coinbase")
          ? "Coinbase"
          : "On-chain / CEX",
      timestamp: w.timestamp ?? now(),
      note: String(w.note ?? w.direction ?? "Whale flow"),
    };
  });
}
