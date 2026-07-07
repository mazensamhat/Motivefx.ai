import { json } from "@/lib/api";
import {
  fetchWhaleAlerts,
  fetchLineMoves,
  scanUnusualOptions,
  scanPennyMovers,
} from "@/lib/terminal/feeds";

export const dynamic = "force-dynamic";

export async function GET() {
  const feeds = {
    finnhub: Boolean(process.env.FINNHUB_API_KEY?.trim()),
    coinstats: Boolean(process.env.COINSTATS_API_KEY?.trim()),
    the_odds_api: Boolean(process.env.THE_ODDS_API_KEY?.trim()),
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
