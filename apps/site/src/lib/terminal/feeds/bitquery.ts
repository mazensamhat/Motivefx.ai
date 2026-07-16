/**
 * Bitquery GraphQL adapter — Polymarket sports / prediction enrichment on Polygon.
 *
 * Primary sports odds remain SharpAPI (+ The Odds API backup).
 * Primary Polymarket board remains Gamma (free, no key).
 * Bitquery is optional enrichment for cricket / NBA / NFL / esports-style markets
 * when BITQUERY_API_KEY is set (Bearer token from account.bitquery.io).
 *
 * Docs: https://docs.bitquery.io/docs/examples/polymarket-api/polymarket-sports-api/
 * Endpoint: https://streaming.bitquery.io/graphql
 * Auth: Authorization: Bearer <token> — points-based billing; not a free unlimited feed.
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

export function isBitqueryConfigured(): boolean {
  return Boolean(process.env.BITQUERY_API_KEY?.trim());
}

/** Off unless key present; set BITQUERY_ENABLED=false to keep key but disable calls. */
export function isBitqueryEnabled(): boolean {
  if (process.env.BITQUERY_ENABLED?.trim().toLowerCase() === "false") return false;
  return isBitqueryConfigured();
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

async function bitqueryGraphql(
  token: string,
  query: string,
  variables: Record<string, unknown>
): Promise<{ rows: BitqueryTradeRow[]; error?: string }> {
  const res = await fetch(BITQUERY_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    return {
      rows: [],
      error: `Bitquery HTTP ${res.status}${body ? `: ${body.slice(0, 180)}` : ""}`,
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
}

export async function fetchBitquerySportsMarkets(
  limit = 12
): Promise<{ items: BitqueryMarketItem[]; error?: string }> {
  if (!isBitqueryEnabled()) {
    return {
      items: [],
      error:
        "Bitquery disabled — set BITQUERY_API_KEY (and leave BITQUERY_ENABLED unset/true). Signup: https://account.bitquery.io",
    };
  }
  const token = process.env.BITQUERY_API_KEY!.trim();
  const updatedAt = new Date().toISOString();
  const perQuery = Math.min(Math.max(Math.ceil(limit / 2), 5), 20);

  try {
    // Parallel documented filters: cricket ResolutionSource + NBA/NFL/Esports Title keywords.
    const [cricket, nba, nfl, esports] = await Promise.all([
      bitqueryGraphql(token, CRICKET_RESOLUTION_QUERY, { time_ago: 24, limit: perQuery }),
      bitqueryGraphql(token, SPORTS_TITLE_QUERY, { time_ago: 24, limit: perQuery, title: "NBA" }),
      bitqueryGraphql(token, SPORTS_TITLE_QUERY, { time_ago: 24, limit: perQuery, title: "NFL" }),
      bitqueryGraphql(token, SPORTS_TITLE_QUERY, {
        time_ago: 24,
        limit: perQuery,
        title: "Esports",
      }),
    ]);

    const errors = [cricket.error, nba.error, nfl.error, esports.error].filter(Boolean);
    const merged = mapRows(
      [...cricket.rows, ...nba.rows, ...nfl.rows, ...esports.rows],
      updatedAt
    ).slice(0, limit);

    if (!merged.length) {
      return {
        items: [],
        error: errors[0] ?? "Bitquery returned no sports markets in the last 24h.",
      };
    }
    return {
      items: merged,
      error: errors.length ? `Partial Bitquery errors: ${errors.join(" | ")}` : undefined,
    };
  } catch (err) {
    return {
      items: [],
      error: err instanceof Error ? err.message : "Bitquery request failed",
    };
  }
}
