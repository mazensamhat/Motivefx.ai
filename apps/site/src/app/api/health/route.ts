import { json } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET() {
  let polymarket = false;
  try {
    const res = await fetch(
      "https://gamma-api.polymarket.com/events?active=true&closed=false&limit=1&order=volume_24hr&ascending=false",
      { cache: "no-store" }
    );
    polymarket = res.ok;
  } catch {
    polymarket = false;
  }

  // /v4/sports does not consume Odds API quota. Use it to verify the key, and
  // treat x-requests-remaining=0 as unhealthy so health matches odds fetch reality.
  let theOddsApi = false;
  const oddsKey = process.env.THE_ODDS_API_KEY?.trim();
  if (oddsKey) {
    try {
      const oddsRes = await fetch(
        `https://api.the-odds-api.com/v4/sports/?apiKey=${encodeURIComponent(oddsKey)}`,
        { cache: "no-store" }
      );
      if (oddsRes.ok) {
        const remainingRaw = oddsRes.headers.get("x-requests-remaining");
        const remaining = remainingRaw != null ? Number(remainingRaw) : null;
        theOddsApi = remaining == null || Number.isNaN(remaining) ? true : remaining > 0;
      }
    } catch {
      theOddsApi = false;
    }
  }

  const feeds = {
    finnhub: Boolean(process.env.FINNHUB_API_KEY?.trim()),
    coinstats: Boolean(process.env.COINSTATS_API_KEY?.trim()),
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
    platform: "vercel",
  });
}

export async function HEAD() {
  return new Response(null, { status: 200 });
}
