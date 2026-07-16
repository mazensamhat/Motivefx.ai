import { userTrackedSymbols } from "../watchlist";

export type NewsModule = "trades" | "penny" | "crypto" | "betting" | "predictions";

export type NewsItem = {
  id: string;
  headline: string;
  summary: string;
  source: string;
  category: string;
  impact: string;
  tags?: string[];
  timestamp: string;
  relevanceScore: number;
  relevanceReason: string;
  affectsYou: boolean;
};

type NewsFetchResult = {
  items: NewsItem[];
  source: "live" | "demo";
  error?: string;
};

const NEWS_CACHE_TTL_MS = 5 * 60 * 1000;

type FinnhubNewsRow = {
  category?: string;
  datetime?: number;
  headline?: string;
  id?: number;
  related?: string;
  source?: string;
  summary?: string;
};

type CoinStatsNewsRow = {
  id?: string;
  title?: string;
  description?: string;
  feedName?: string;
  publishedAt?: string;
};

type RawNewsRow = {
  id: string;
  headline: string;
  summary: string;
  source: string;
  category: string;
  timestamp: string;
  related?: string;
  tags?: string[];
};

const newsCache = new Map<
  string,
  { expires: number; value?: NewsFetchResult; inflight?: Promise<NewsFetchResult> }
>();

const MODULE_SYMBOLS: Record<NewsModule, string[]> = {
  trades: ["NVDA", "TSLA", "AAPL", "MSFT", "AMD"],
  penny: ["SNDL", "AMC", "OPEN", "BBAI", "BNGO"],
  crypto: ["BTC", "ETH", "SOL", "XRP", "DOGE"],
  betting: [],
  predictions: [],
};

const MODULE_KEYWORDS: Record<NewsModule, RegExp> = {
  trades: /\b(earnings|fed|options|stocks?|market|sec|ipo|nasdaq|s&p|dow)\b/i,
  penny: /\b(penny|microcap|small.?cap|meme|retail|float|otc|biotech)\b/i,
  crypto: /\b(bitcoin|btc|ethereum|eth|crypto|defi|blockchain|solana|etf|stablecoin|token)\b/i,
  betting: /\b(nfl|nba|mlb|nhl|ufc|soccer|mls|odds|sports?|betting|spread|line|playoff|super bowl)\b/i,
  predictions: /\b(election|trump|biden|fed|inflation|war|geopolit|polymarket|prediction|tariff|congress|gdp)\b/i,
};

const HIGH_IMPACT = /\b(crashes?|surges?|emergency|war|fed|rate hike|rate cut|earnings|bankruptcy|halt|investigation)\b/i;

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

function isoFromUnixSec(sec?: number): string {
  if (!sec || !Number.isFinite(sec)) return new Date().toISOString();
  return new Date(sec * 1000).toISOString();
}

function truncate(text: string, max = 220): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trim()}…`;
}

function mapCategory(module: NewsModule, raw: string, headline: string): string {
  const blob = `${raw} ${headline}`.toLowerCase();
  if (/\bearnings\b/.test(blob)) return "earnings";
  if (/\b(fed|inflation|gdp|jobs report)\b/.test(blob)) return "economic";
  if (/\b(crypto|bitcoin|ethereum|defi)\b/.test(blob)) return "crypto";
  if (/\b(nfl|nba|mlb|sports?|ufc|soccer)\b/.test(blob)) return "sports";
  if (/\b(war|election|trump|biden|geopolit)\b/.test(blob)) return "geopolitical";
  if (/\b(regulat|sec |cftc|fda)\b/.test(blob)) return "regulatory";
  if (module === "crypto") return "crypto";
  if (module === "betting") return "sports";
  if (module === "predictions") return "global";
  return "market";
}

function scoreRelevance(
  module: NewsModule,
  row: RawNewsRow,
  tracked: Set<string>
): { score: number; affectsYou: boolean; reason: string } {
  let score = 55;
  const reasons: string[] = [];
  const related = row.related?.toUpperCase();
  const blob = `${row.headline} ${row.summary}`.toLowerCase();

  if (related && tracked.has(related)) {
    score += 28;
    reasons.push(`Matches ${related} on your radar`);
  }

  if (MODULE_KEYWORDS[module].test(blob)) {
    score += 12;
    reasons.push(`Tagged for ${module} desk context`);
  }

  for (const sym of MODULE_SYMBOLS[module]) {
    if (new RegExp(`\\b${sym}\\b`, "i").test(`${row.headline} ${row.summary} ${related ?? ""}`)) {
      score += tracked.has(sym) ? 10 : 6;
      if (!reasons.some((r) => r.includes(sym))) {
        reasons.push(`Mentions ${sym}`);
      }
    }
  }

  if (HIGH_IMPACT.test(blob)) score += 8;

  const affectsYou = Boolean(related && tracked.has(related)) || score >= 78;
  return {
    score: Math.min(95, score),
    affectsYou,
    reason: reasons[0] ?? "Cross-referenced with module keywords and desk signals.",
  };
}

function toNewsItem(module: NewsModule, row: RawNewsRow, tracked: Set<string>): NewsItem {
  const rel = scoreRelevance(module, row, tracked);
  const blob = `${row.headline} ${row.summary}`;
  return {
    id: row.id,
    headline: row.headline,
    summary: truncate(row.summary || row.headline),
    source: row.source || "Wire",
    category: mapCategory(module, row.category, row.headline),
    impact: HIGH_IMPACT.test(blob) ? "high" : "medium",
    tags: row.tags ?? (row.related ? [row.related] : undefined),
    timestamp: row.timestamp,
    relevanceScore: rel.score,
    relevanceReason: rel.reason,
    affectsYou: rel.affectsYou,
  };
}

function dedupeRows(rows: RawNewsRow[]): RawNewsRow[] {
  const seen = new Set<string>();
  const out: RawNewsRow[] = [];
  for (const row of rows) {
    const key = row.headline.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }
  return out;
}

async function fetchFinnhubCategory(
  apiKey: string,
  category: string
): Promise<RawNewsRow[]> {
  const res = await withTimeout(
    fetch(
      `https://finnhub.io/api/v1/news?category=${encodeURIComponent(category)}&token=${encodeURIComponent(apiKey)}`,
      { next: { revalidate: 300 } }
    ),
    4000
  );
  if (!res?.ok) return [];
  const rows = (await res.json()) as FinnhubNewsRow[];
  return rows.map((r) => ({
    id: `finn-${r.id ?? r.headline}`,
    headline: String(r.headline ?? "").trim(),
    summary: String(r.summary ?? r.headline ?? "").trim(),
    source: String(r.source ?? "Finnhub"),
    category: String(r.category ?? category),
    timestamp: isoFromUnixSec(r.datetime),
    related: r.related?.toUpperCase(),
    tags: r.related ? [r.related.toUpperCase()] : undefined,
  }));
}

async function fetchFinnhubCompanyNews(
  apiKey: string,
  symbol: string
): Promise<RawNewsRow[]> {
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - 7);
  const fromStr = from.toISOString().slice(0, 10);
  const toStr = to.toISOString().slice(0, 10);
  const res = await withTimeout(
    fetch(
      `https://finnhub.io/api/v1/company-news?symbol=${encodeURIComponent(symbol)}&from=${fromStr}&to=${toStr}&token=${encodeURIComponent(apiKey)}`,
      { next: { revalidate: 300 } }
    ),
    4000
  );
  if (!res?.ok) return [];
  const rows = (await res.json()) as FinnhubNewsRow[];
  return rows.map((r) => ({
    id: `finn-${symbol}-${r.id ?? r.headline}`,
    headline: String(r.headline ?? "").trim(),
    summary: String(r.summary ?? r.headline ?? "").trim(),
    source: String(r.source ?? "Finnhub"),
    category: String(r.category ?? "company"),
    timestamp: isoFromUnixSec(r.datetime),
    related: symbol.toUpperCase(),
    tags: [symbol.toUpperCase()],
  }));
}

async function fetchCoinStatsNews(apiKey: string, limit: number): Promise<RawNewsRow[]> {
  const res = await withTimeout(
    fetch(`https://openapiv1.coinstats.app/news?limit=${Math.min(limit, 20)}`, {
      headers: { "X-API-KEY": apiKey },
      next: { revalidate: 300 },
    }),
    4000
  );
  if (!res?.ok) return [];
  const payload = (await res.json()) as { news?: CoinStatsNewsRow[] };
  return (payload.news ?? []).map((r) => ({
    id: `cs-${r.id ?? r.title}`,
    headline: String(r.title ?? "").trim(),
    summary: String(r.description ?? r.title ?? "").trim(),
    source: String(r.feedName ?? "CoinStats"),
    category: "crypto",
    timestamp: r.publishedAt ? new Date(r.publishedAt).toISOString() : new Date().toISOString(),
    tags: ["crypto"],
  }));
}

function filterForModule(module: NewsModule, rows: RawNewsRow[]): RawNewsRow[] {
  const re = MODULE_KEYWORDS[module];
  return rows.filter((row) => {
    const blob = `${row.headline} ${row.summary} ${row.related ?? ""}`;
    if (re.test(blob)) return true;
    if (row.related && MODULE_SYMBOLS[module].includes(row.related.toUpperCase())) return true;
    return module === "trades";
  });
}

function demoNews(module: NewsModule): NewsItem[] {
  const ts = new Date().toISOString();
  const base: Record<NewsModule, NewsItem[]> = {
    trades: [
      {
        id: "demo-trades-1",
        headline: "Mega-cap earnings week drives options volume across NVDA and AAPL",
        summary: "Desk flow shows elevated call activity into print — monitor implied move vs historical reaction.",
        source: "MotiveFX Desk",
        category: "earnings",
        impact: "high",
        tags: ["NVDA", "AAPL"],
        timestamp: ts,
        relevanceScore: 82,
        relevanceReason: "Earnings catalyst on widely held mega-cap names.",
        affectsYou: true,
      },
      {
        id: "demo-trades-2",
        headline: "Fed speakers on deck — rate path repricing likely in front-end yields",
        summary: "Macro headline risk into FOMC blackout window; equity beta may compress on hawkish tone.",
        source: "Macro Wire",
        category: "economic",
        impact: "high",
        tags: ["macro"],
        timestamp: ts,
        relevanceScore: 74,
        relevanceReason: "Cross-market event risk for equities desk.",
        affectsYou: false,
      },
    ],
    penny: [
      {
        id: "demo-penny-1",
        headline: "Retail microcap volume spikes on social momentum scanners",
        summary: "Several sub-$5 names printing 3x+ average volume — float rotation watch active.",
        source: "Pink Slips Radar",
        category: "market",
        impact: "medium",
        tags: ["SNDL", "AMC"],
        timestamp: ts,
        relevanceScore: 80,
        relevanceReason: "Microcap momentum aligns with penny module signals.",
        affectsYou: true,
      },
    ],
    crypto: [
      {
        id: "demo-crypto-1",
        headline: "Bitcoin ETF flows stay positive as ETH staking yields compress",
        summary: "Spot demand supports BTC while alt beta lags — watch exchange inflow metrics.",
        source: "Crypto Wire",
        category: "crypto",
        impact: "medium",
        tags: ["BTC", "ETH"],
        timestamp: ts,
        relevanceScore: 85,
        relevanceReason: "Core assets on crypto desk radar.",
        affectsYou: true,
      },
    ],
    betting: [
      {
        id: "demo-betting-1",
        headline: "NFL camp reports move early-season win totals on key QBs",
        summary: "Injury notes and depth-chart shuffles shifting opener lines across books.",
        source: "Lines Desk",
        category: "sports",
        impact: "medium",
        tags: ["NFL"],
        timestamp: ts,
        relevanceScore: 78,
        relevanceReason: "Sports headline risk for opening lines.",
        affectsYou: false,
      },
    ],
    predictions: [
      {
        id: "demo-predictions-1",
        headline: "Election contract volume rises as polling spreads narrow in swing states",
        summary: "Prediction markets repricing tail outcomes — resolution rules remain the key filter.",
        source: "Predictions Desk",
        category: "geopolitical",
        impact: "high",
        tags: ["politics"],
        timestamp: ts,
        relevanceScore: 83,
        relevanceReason: "Event-contract catalyst on predictions board.",
        affectsYou: true,
      },
    ],
  };
  return base[module];
}

async function loadRawNews(module: NewsModule, limit: number): Promise<RawNewsRow[]> {
  const finnhubKey = process.env.FINNHUB_API_KEY?.trim();
  const coinstatsKey = process.env.COINSTATS_API_KEY?.trim();
  const tasks: Promise<RawNewsRow[]>[] = [];

  if (module === "crypto" && coinstatsKey) {
    tasks.push(fetchCoinStatsNews(coinstatsKey, limit));
  }

  if (finnhubKey) {
    if (module === "crypto") {
      tasks.push(fetchFinnhubCategory(finnhubKey, "crypto"));
    } else if (module === "trades" || module === "penny") {
      tasks.push(fetchFinnhubCategory(finnhubKey, "general"));
      for (const sym of MODULE_SYMBOLS[module].slice(0, 3)) {
        tasks.push(fetchFinnhubCompanyNews(finnhubKey, sym));
      }
    } else {
      tasks.push(fetchFinnhubCategory(finnhubKey, "general"));
    }
  }

  if (!tasks.length) return [];

  const batches = await Promise.all(tasks);
  const merged = dedupeRows(batches.flat()).sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const filtered = filterForModule(module, merged);
  return (filtered.length ? filtered : merged).slice(0, Math.max(limit * 2, 12));
}

async function fetchNewsUncached(
  module: NewsModule,
  limit: number,
  userId: string
): Promise<NewsFetchResult> {
  let tracked = new Set<string>();
  if (userId && userId !== "demo" && !userId.startsWith("u_")) {
    try {
      tracked = await userTrackedSymbols(userId);
    } catch {
      tracked = new Set();
    }
  } else {
    tracked = new Set(MODULE_SYMBOLS[module]);
  }

  try {
    const raw = await loadRawNews(module, limit);
    if (!raw.length) {
      const demo = demoNews(module).slice(0, limit);
      return {
        items: demo,
        source: "demo",
        error: "Live news wire unavailable — showing sample headlines.",
      };
    }

    const items = raw
      .slice(0, limit)
      .map((row) => toNewsItem(module, row, tracked))
      .sort((a, b) => {
        if (a.affectsYou !== b.affectsYou) return a.affectsYou ? -1 : 1;
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      });

    return { items, source: "live" };
  } catch (err) {
    return {
      items: demoNews(module).slice(0, limit),
      source: "demo",
      error: err instanceof Error ? err.message : "News feed unavailable.",
    };
  }
}

export async function fetchModuleNews(
  module: NewsModule,
  limit = 10,
  userId = "demo"
): Promise<NewsFetchResult & { personalCount: number }> {
  const cacheKey = `${module}:${limit}:${userId.startsWith("u_") ? "anon" : userId}`;
  const hit = newsCache.get(cacheKey);
  const nowMs = Date.now();
  if (hit?.value && hit.expires > nowMs) {
    const personalCount = hit.value.items.filter((i) => i.affectsYou).length;
    return { ...hit.value, personalCount };
  }
  if (hit?.inflight) {
    const result = await hit.inflight;
    const personalCount = result.items.filter((i) => i.affectsYou).length;
    return { ...result, personalCount };
  }

  const inflight = fetchNewsUncached(module, limit, userId).then((value) => {
    newsCache.set(cacheKey, { expires: Date.now() + NEWS_CACHE_TTL_MS, value });
    return value;
  });

  newsCache.set(cacheKey, { expires: 0, value: hit?.value, inflight });
  const result = await inflight;
  const personalCount = result.items.filter((i) => i.affectsYou).length;
  return { ...result, personalCount };
}
