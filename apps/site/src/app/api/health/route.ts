import { json } from "@/lib/api";
import { getOddsApiQuota, getSharpApiQuota } from "@/lib/terminal/feeds";

export const dynamic = "force-dynamic";

export async function GET() {
  let polymarket = false;
  try {
    const res = await fetch(
      "https://gamma-api.polymarket.com/events?active=true&closed=false&limit=1&order=volume_24hr&ascending=false",
      { next: { revalidate: 600 } }
    );
    polymarket = res.ok;
  } catch {
    polymarket = false;
  }

  // SharpAPI: light /sports probe (counts toward req/min). Prefer cached rate-limit headers.
  let sharpApi = false;
  const sharpKey = process.env.SHARP_API_KEY?.trim();
  let sharpRemaining: number | null = getSharpApiQuota().remaining;
  let sharpLimit: number | null = getSharpApiQuota().limit;
  let sharpReset: number | null = getSharpApiQuota().reset;
  let sharpDataDelay: number | null = getSharpApiQuota().dataDelay;
  if (sharpKey) {
    try {
      const base =
        (process.env.SHARP_API_BASE_URL?.trim() || "https://api.sharpapi.io/api/v1").replace(
          /\/+$/,
          ""
        );
      const sharpRes = await fetch(`${base}/sports`, {
        headers: { "X-API-Key": sharpKey },
        cache: "no-store",
      });
      const remainingRaw = sharpRes.headers.get("x-ratelimit-remaining");
      const limitRaw = sharpRes.headers.get("x-ratelimit-limit");
      const resetRaw = sharpRes.headers.get("x-ratelimit-reset");
      const delayRaw = sharpRes.headers.get("x-data-delay");
      if (remainingRaw != null && !Number.isNaN(Number(remainingRaw))) {
        sharpRemaining = Number(remainingRaw);
      }
      if (limitRaw != null && !Number.isNaN(Number(limitRaw))) {
        sharpLimit = Number(limitRaw);
      }
      if (resetRaw != null && !Number.isNaN(Number(resetRaw))) {
        sharpReset = Number(resetRaw);
      }
      if (delayRaw != null && !Number.isNaN(Number(delayRaw))) {
        sharpDataDelay = Number(delayRaw);
      }
      sharpApi = sharpRes.ok;
    } catch {
      sharpApi = false;
    }
  }

  // /v4/sports does not consume Odds API quota. Use it to verify the key, and
  // treat x-requests-remaining=0 as unhealthy so health matches odds fetch reality.
  let theOddsApi = false;
  let oddsRemaining: number | null = getOddsApiQuota().remaining;
  let oddsUsed: number | null = getOddsApiQuota().used;
  const oddsKey = process.env.THE_ODDS_API_KEY?.trim();
  if (oddsKey) {
    try {
      const oddsRes = await fetch(
        `https://api.the-odds-api.com/v4/sports/?apiKey=${encodeURIComponent(oddsKey)}`,
        { cache: "no-store" }
      );
      if (oddsRes.ok) {
        const remainingRaw = oddsRes.headers.get("x-requests-remaining");
        const usedRaw = oddsRes.headers.get("x-requests-used");
        const remaining = remainingRaw != null ? Number(remainingRaw) : null;
        const used = usedRaw != null ? Number(usedRaw) : null;
        if (remaining != null && !Number.isNaN(remaining)) oddsRemaining = remaining;
        if (used != null && !Number.isNaN(used)) oddsUsed = used;
        theOddsApi = remaining == null || Number.isNaN(remaining) ? true : remaining > 0;
      }
    } catch {
      theOddsApi = false;
    }
  }

  const feeds = {
    finnhub: Boolean(process.env.FINNHUB_API_KEY?.trim()),
    coinstats: Boolean(process.env.COINSTATS_API_KEY?.trim()),
    sharp_api: sharpApi,
    the_odds_api: theOddsApi,
    polymarket,
    stripe: Boolean(process.env.STRIPE_SECRET_KEY?.trim()),
    openai: Boolean(process.env.OPENAI_API_KEY?.trim()),
  };

  return json({
    status: "ok",
    app: "MotiveFX.AI",
    timestamp: new Date().toISOString(),
    feeds,
    /** Prefer SharpAPI remaining (req/min window); Odds credits are backup. */
    quota: {
      sharp_api: {
        remaining: sharpRemaining,
        limit: sharpLimit,
        reset: sharpReset,
        dataDelay: sharpDataDelay,
        configured: Boolean(sharpKey),
      },
      the_odds_api: {
        remaining: oddsRemaining,
        used: oddsUsed,
        configured: Boolean(oddsKey),
      },
    },
    platform: "vercel",
  });
}

export async function HEAD() {
  return new Response(null, { status: 200 });
}
