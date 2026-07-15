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

  const feeds = {
    finnhub: Boolean(process.env.FINNHUB_API_KEY?.trim()),
    coinstats: Boolean(process.env.COINSTATS_API_KEY?.trim()),
    the_odds_api: Boolean(process.env.THE_ODDS_API_KEY?.trim()),
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
