/**
 * Bitquery GraphQL adapter — Polymarket sports / prediction enrichment on Polygon.
 *
 * Primary Polymarket board remains Gamma (free, no key).
 * Bitquery is optional enrichment only — must never break or delay the Gamma board.
 *
 * Hardening (quota / session limits):
 * - 15-minute TTL cache + stale-while-revalidate (serve last good up to 2h)
 * - Circuit-breaker cooldown after 403/429 / concurrent-session errors
 * - Single-flight coalescing (no stampede across /markets + /bitquery-sports)
 * - Sequential GraphQL (never 4 parallel queries — that caused session-limit 403s)
 * - Short per-request timeout so callers fall back to Gamma quickly
 *
 * Docs: https://docs.bitquery.io/docs/examples/polymarket-api/polymarket-sports-api/
 * Endpoint: https://streaming.bitquery.io/graphql
 * Auth: Authorization: Bearer <ory_at_...> — not a v1 API key.
 */

/** Compatible with PredictionMarketItem in feeds/index.ts (avoid circular import). */
export type BitqueryMarketItem = {
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

const BITQUERY_ENDPOINT = "https://streaming.bitquery.io/graphql";
const BITQUERY_OAUTH_URL = "https://oauth2.bitquery.io/oauth2/token";

/** Fresh window — most Polymarket traffic hits cached enrichment. */
const CACHE_TTL_MS = 15 * 60 * 1000;
/** Serve last-good results this long when Bitquery is limited / down. */
const STALE_MAX_MS = 2 * 60 * 60 * 1000;
/** After 403/429/session-limit, stop calling Bitquery for this long. */
const COOLDOWN_MS = 12 * 60 * 1000;
/** Hard cap so /predictions/markets never waits on Bitquery. */
const REQUEST_TIMEOUT_MS = 6_000;

/** Strip accidental "Bearer " prefix from env paste. */
function normalizeBitqueryToken(raw: string): string {
  const t = raw.trim();
  return t.replace(/^Bearer\s+/i, "").trim();
}

function hasBitqueryClientCredentials(): boolean {
  return Boolean(
    process.env.BITQUERY_CLIENT_ID?.trim() && process.env.BITQUERY_CLIENT_SECRET?.trim()
  );
}

export function isBitqueryConfigured(): boolean {
  return Boolean(process.env.BITQUERY_API_KEY?.trim()) || hasBitqueryClientCredentials();
}

/** Off unless key present; set BITQUERY_ENABLED=false to keep key but disable calls. */
export function isBitqueryEnabled(): boolean {
  if (process.env.BITQUERY_ENABLED?.trim().toLowerCase() === "false") return false;
  return isBitqueryConfigured();
}

let cachedOAuth: { token: string; expiresAt: number } | null = null;

async function resolveBitqueryAccessToken(): Promise<{ token: string; error?: string }> {
  const staticKey = process.env.BITQUERY_API_KEY?.trim();
  if (staticKey) {
    return { token: normalizeBitqueryToken(staticKey) };
  }

  const clientId = process.env.BITQUERY_CLIENT_ID?.trim();
  const clientSecret = process.env.BITQUERY_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    return {
      token: "",
      error:
        "Bitquery disabled — set BITQUERY_API_KEY (ory_at_… access token) or BITQUERY_CLIENT_ID + BITQUERY_CLIENT_SECRET.",
    };
  }

  const now = Date.now();
  if (cachedOAuth && cachedOAuth.expiresAt > now + 60_000) {
    return { token: cachedOAuth.token };
  }

  try {
    const body = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
      scope: "api",
    });
    const res = await fetch(BITQUERY_OAUTH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      cache: "no-store",
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return {
        token: "",
        error: `Bitquery OAuth HTTP ${res.status}${text ? `: ${text.slice(0, 160)}` : ""}`,
      };
    }
    const json = (await res.json()) as { access_token?: string; expires_in?: number };
    const token = json.access_token?.trim();
    if (!token) {
      return { token: "", error: "Bitquery OAuth response missing access_token." };
    }
    const expiresInSec = Number(json.expires_in) || 3600;
    cachedOAuth = { token, expiresAt: now + expiresInSec * 1000 };
    return { token };
  } catch (err) {
    return {
      token: "",
      error: err instanceof Error ? err.message : "Bitquery OAuth failed.",
    };
  }
}

type BitqueryTradeRow = {
  Trade?: {
    Prediction?: {
      Question?: { Title?: string; Id?: string; ResolutionSource?: string };
      Outcome?: { label0?: string; label1?: string };
    };
    OutcomeTrade?: { price0?: number; price1?: number };
  };
  sumBuyAndSell?: number | string;
};

function formatUsdVolume(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "$0";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${Math.round(n)}`;
}

function categorizeSportsTitle(title: string, resolutionSource: string): {
  category: string;
  categoryLabel: string;
} {
  const blob = `${title} ${resolutionSource}`.toLowerCase();
  if (/cricket|espncricinfo|ipl|t20/.test(blob)) {
    return { category: "sports", categoryLabel: "Sports · Cricket" };
  }
  if (/esport|valorant|cs2|csgo|league of legends|dota|lol\b/.test(blob)) {
    return { category: "sports", categoryLabel: "Sports · Esports" };
  }
  if (/nba|wnba|basketball/.test(blob)) {
    return { category: "sports", categoryLabel: "Sports · NBA" };
  }
  if (/\bnfl\b|super bowl|american football/.test(blob)) {
    return { category: "sports", categoryLabel: "Sports · NFL" };
  }
  if (/ufc|mma|fight/.test(blob)) {
    return { category: "sports", categoryLabel: "Sports · UFC" };
  }
  return { category: "sports", categoryLabel: "Sports & Predictions" };
}

/** Title keyword filter (NBA / NFL / Esports). */
const SPORTS_TITLE_QUERY = `
query MotiveFxSportsByTitle($time_ago: Int!, $limit: Int!, $title: String!) {
  EVM(network: matic) {
    PredictionTrades(
      where: {
        Block: { Time: { since_relative: { hours_ago: $time_ago } } }
        Trade: {
          Prediction: {
            Question: { Title: { includesCaseInsensitive: $title } }
          }
        }
      }
      limit: { count: $limit }
      orderBy: { descendingByField: "sumBuyAndSell" }
    ) {
      Trade {
        Prediction {
          Question { Id Title ResolutionSource }
          Outcome {
            label0: Label(if: { Trade: { Prediction: { Outcome: { Index: { eq: 0 } } } } })
            label1: Label(if: { Trade: { Prediction: { Outcome: { Index: { eq: 1 } } } } })
          }
        }
        OutcomeTrade {
          price0: Price(
            maximum: Block_Time
            if: { Trade: { Prediction: { Outcome: { Index: { eq: 0 } } } } }
          )
        }
      }
      buyUSD: sum(
        of: Trade_OutcomeTrade_CollateralAmountInUSD
        if: { Trade: { OutcomeTrade: { IsOutcomeBuy: true } } }
      )
      sellUSD: sum(
        of: Trade_OutcomeTrade_CollateralAmountInUSD
        if: { Trade: { OutcomeTrade: { IsOutcomeBuy: false } } }
      )
      sumBuyAndSell: calculate(expression: "$buyUSD + $sellUSD")
    }
  }
}
`;

const CRICKET_RESOLUTION_QUERY = `
query MotiveFxCricketMarkets($time_ago: Int!, $limit: Int!) {
  EVM(network: matic) {
    PredictionTrades(
      where: {
        Block: { Time: { since_relative: { hours_ago: $time_ago } } }
        Trade: {
          Prediction: {
            Question: { ResolutionSource: { includes: "espncricinfo.com" } }
          }
        }
      }
      limit: { count: $limit }
      orderBy: { descendingByField: "sumBuyAndSell" }
    ) {
      Trade {
        Prediction {
          Question { Id Title ResolutionSource }
        }
        OutcomeTrade {
          price0: Price(
            maximum: Block_Time
            if: { Trade: { Prediction: { Outcome: { Index: { eq: 0 } } } } }
          )
        }
      }
      buyUSD: sum(
        of: Trade_OutcomeTrade_CollateralAmountInUSD
        if: { Trade: { OutcomeTrade: { IsOutcomeBuy: true } } }
      )
      sellUSD: sum(
        of: Trade_OutcomeTrade_CollateralAmountInUSD
        if: { Trade: { OutcomeTrade: { IsOutcomeBuy: false } } }
      )
      sumBuyAndSell: calculate(expression: "$buyUSD + $sellUSD")
    }
  }
}
`;

function mapRows(rows: BitqueryTradeRow[], updatedAt: string): BitqueryMarketItem[] {
  const items: BitqueryMarketItem[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    const title = String(row.Trade?.Prediction?.Question?.Title ?? "").trim();
    if (!title || seen.has(title.toLowerCase())) continue;
    seen.add(title.toLowerCase());
    const price0 = Number(row.Trade?.OutcomeTrade?.price0);
    const yes = Number.isFinite(price0) ? Math.min(1, Math.max(0, price0)) : 0.5;
    const vol = Number(row.sumBuyAndSell ?? 0);
    const resolution = String(row.Trade?.Prediction?.Question?.ResolutionSource ?? "");
    const cats = categorizeSportsTitle(title, resolution);
    items.push({
      market: title,
      platform: "Polymarket · Bitquery",
      yes,
      no: Math.round((1 - yes) * 1000) / 1000,
      volume24h: formatUsdVolume(vol),
      category: cats.category,
      categoryLabel: cats.categoryLabel,
      slug: String(row.Trade?.Prediction?.Question?.Id ?? ""),
      timestamp: updatedAt,
    });
  }
  return items;
}

function isRateLimitedMessage(msg: string): boolean {
  return /403|429|session limit|concurrent|rate.?limit|quota|too many|throttl/i.test(msg);
}

type BitqueryCacheEntry = {
  items: BitqueryMarketItem[];
  fetchedAt: number;
  lastError?: string;
};

type BitqueryFetchResult = {
  items: BitqueryMarketItem[];
  error?: string;
  cached?: boolean;
  stale?: boolean;
  coolingDown?: boolean;
};

let bitqueryCache: BitqueryCacheEntry | null = null;
let cooldownUntil = 0;
let inflight: Promise<BitqueryFetchResult> | null = null;
/** Rotate secondary title keyword so we don't burn 4 queries every refresh. */
let titleRotation = 0;
const TITLE_KEYWORDS = ["NBA", "NFL", "Esports"] as const;

export function getBitqueryQuotaStatus() {
  const now = Date.now();
  return {
    configured: isBitqueryConfigured(),
    enabled: isBitqueryEnabled(),
    coolingDown: now < cooldownUntil,
    cooldownEndsAt: cooldownUntil > now ? new Date(cooldownUntil).toISOString() : null,
    cacheAgeMs: bitqueryCache ? now - bitqueryCache.fetchedAt : null,
    cacheItems: bitqueryCache?.items.length ?? 0,
    lastError: bitqueryCache?.lastError ?? null,
  };
}

function staleFromCache(limit: number, note?: string): BitqueryFetchResult | null {
  if (!bitqueryCache) return null;
  const age = Date.now() - bitqueryCache.fetchedAt;
  if (age > STALE_MAX_MS || !bitqueryCache.items.length) return null;
  return {
    items: bitqueryCache.items.slice(0, limit),
    cached: true,
    stale: age > CACHE_TTL_MS,
    coolingDown: Date.now() < cooldownUntil,
    // Soft note only — never a hard failure for the Gamma board.
    error: note,
  };
}

async function bitqueryGraphql(
  token: string,
  query: string,
  variables: Record<string, unknown>
): Promise<{ rows: BitqueryTradeRow[]; error?: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(BITQUERY_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "X-API-KEY": token,
      },
      body: JSON.stringify({ query, variables }),
      cache: "no-store",
      signal: controller.signal,
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      const hint =
        res.status === 401
          ? " Use an OAuth access token (ory_at_…) from Access Tokens, or BITQUERY_CLIENT_ID + BITQUERY_CLIENT_SECRET — not a v1 API key."
          : "";
      return {
        rows: [],
        error: `Bitquery HTTP ${res.status}${body ? `: ${body.slice(0, 180)}` : ""}${hint}`,
      };
    }
    const payload = (await res.json()) as {
      data?: { EVM?: { PredictionTrades?: BitqueryTradeRow[] } };
      errors?: Array<{ message?: string }>;
    };
    if (payload.errors?.length) {
      return {
        rows: [],
        error: `Bitquery GraphQL: ${payload.errors.map((e) => e.message).filter(Boolean).join("; ") || "error"}`,
      };
    }
    return { rows: payload.data?.EVM?.PredictionTrades ?? [] };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return { rows: [], error: "Bitquery timeout — using Gamma / cache." };
    }
    return {
      rows: [],
      error: err instanceof Error ? err.message : "Bitquery request failed",
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * At most 2 sequential GraphQL calls per refresh (never parallel).
 * Cricket first (unique value vs Gamma), then one rotating title keyword.
 */
async function fetchLiveBitquery(token: string, limit: number): Promise<BitqueryFetchResult> {
  const updatedAt = new Date().toISOString();
  const perQuery = Math.min(Math.max(limit, 6), 16);
  const rows: BitqueryTradeRow[] = [];
  const errors: string[] = [];

  const cricket = await bitqueryGraphql(token, CRICKET_RESOLUTION_QUERY, {
    time_ago: 24,
    limit: perQuery,
  });
  if (cricket.error) {
    errors.push(cricket.error);
    if (isRateLimitedMessage(cricket.error)) {
      cooldownUntil = Date.now() + COOLDOWN_MS;
      const stale = staleFromCache(limit, "Bitquery rate-limited — serving cached enrichment.");
      if (stale) return stale;
      return { items: [], error: cricket.error, coolingDown: true };
    }
  } else {
    rows.push(...cricket.rows);
  }

  // Only spend a second query if we still need rows and aren't cooling down.
  if (rows.length < limit && Date.now() >= cooldownUntil) {
    const keyword = TITLE_KEYWORDS[titleRotation % TITLE_KEYWORDS.length];
    titleRotation += 1;
    const second = await bitqueryGraphql(token, SPORTS_TITLE_QUERY, {
      time_ago: 24,
      limit: perQuery,
      title: keyword,
    });
    if (second.error) {
      errors.push(second.error);
      if (isRateLimitedMessage(second.error)) {
        cooldownUntil = Date.now() + COOLDOWN_MS;
      }
    } else {
      rows.push(...second.rows);
    }
  }

  const merged = mapRows(rows, updatedAt).slice(0, limit);
  if (merged.length) {
    bitqueryCache = {
      items: merged,
      fetchedAt: Date.now(),
      lastError: errors[0],
    };
    return {
      items: merged,
      error: errors.length ? `Partial Bitquery: ${errors[0]}` : undefined,
    };
  }

  const stale = staleFromCache(
    limit,
    errors[0] ? `Bitquery empty (${errors[0]}) — serving cache.` : "Bitquery empty — serving cache."
  );
  if (stale) return stale;

  return {
    items: [],
    error: errors[0] ?? "Bitquery returned no sports markets in the last 24h.",
  };
}

export async function fetchBitquerySportsMarkets(
  limit = 12
): Promise<BitqueryFetchResult> {
  if (!isBitqueryEnabled()) {
    return {
      items: [],
      error:
        "Bitquery disabled — set BITQUERY_API_KEY (ory_at_… token) or client credentials; leave BITQUERY_ENABLED unset/true. Signup: https://account.bitquery.io",
    };
  }

  const now = Date.now();
  const capped = Math.min(Math.max(limit, 1), 40);

  // Fresh cache hit — zero Bitquery cost.
  if (bitqueryCache && now - bitqueryCache.fetchedAt < CACHE_TTL_MS && bitqueryCache.items.length) {
    return {
      items: bitqueryCache.items.slice(0, capped),
      cached: true,
    };
  }

  // Cooldown: never hammer a limited session — Gamma is enough.
  if (now < cooldownUntil) {
    const stale = staleFromCache(capped);
    if (stale) return { ...stale, coolingDown: true, error: undefined };
    return {
      items: [],
      coolingDown: true,
      error: undefined, // silent — UI should not glitch
    };
  }

  // Coalesce concurrent callers (markets + bitquery-sports + briefing).
  if (inflight) {
    const shared = await inflight;
    return {
      ...shared,
      items: shared.items.slice(0, capped),
      cached: true,
    };
  }

  inflight = (async (): Promise<BitqueryFetchResult> => {
    const auth = await resolveBitqueryAccessToken();
    if (!auth.token) {
      const stale = staleFromCache(capped, auth.error);
      if (stale) return stale;
      return { items: [], error: auth.error ?? "Bitquery auth missing." };
    }
    try {
      return await fetchLiveBitquery(auth.token, capped);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Bitquery request failed";
      if (isRateLimitedMessage(msg)) cooldownUntil = Date.now() + COOLDOWN_MS;
      const stale = staleFromCache(capped, msg);
      if (stale) return stale;
      return { items: [], error: msg };
    }
  })();

  try {
    return await inflight;
  } finally {
    inflight = null;
  }
}
