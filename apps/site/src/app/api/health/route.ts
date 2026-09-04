import { json } from "@/lib/api";
import { getOddsApiQuota, getSharpApiQuota, getSlateCacheConfig } from "@/lib/terminal/feeds";
import {
  getBitqueryQuotaStatus,
  isBitqueryEnabled,
} from "@/lib/terminal/feeds/bitquery";

export const dynamic = "force-dynamic";

/**
 * Public liveness/configuration health.
 *
 * Keep this endpoint passive. Public traffic must never be able to spend paid
 * provider quota or create a fan-out of upstream requests just by polling
 * /api/health. Detailed provider probing belongs in authenticated Ops routes.
 */
export async function GET() {
  const sharpKey = process.env.SHARP_API_KEY?.trim();
  const sharpQuota = getSharpApiQuota();
  const oddsKey = process.env.THE_ODDS_API_KEY?.trim();
  const oddsQuota = getOddsApiQuota();

  const feeds = {
    finnhub: Boolean(process.env.FINNHUB_API_KEY?.trim()),
    coinstats: Boolean(process.env.COINSTATS_API_KEY?.trim()),
    sharp_api: Boolean(sharpKey),
    the_odds_api: Boolean(oddsKey),
    polymarket: true,
    bitquery: isBitqueryEnabled(),
    stripe: Boolean(process.env.STRIPE_SECRET_KEY?.trim()),
    openai: Boolean(process.env.OPENAI_API_KEY?.trim()),
  };

  const cache = getSlateCacheConfig();

  return json({
    status: "ok",
    app: "MotiveFX.AI",
    timestamp: new Date().toISOString(),
    feeds,
    quota: {
      sharp_api: {
        remaining: sharpQuota.remaining,
        limit: sharpQuota.limit,
        reset: sharpQuota.reset,
        dataDelay: sharpQuota.dataDelay,
        configured: Boolean(sharpKey),
      },
      the_odds_api: {
        remaining: oddsQuota.remaining,
        used: oddsQuota.used,
        configured: Boolean(oddsKey),
      },
      bitquery: getBitqueryQuotaStatus(),
    },
    cache: {
      oddsBoardTtlSec: Math.round(cache.oddsBoardTtlMs / 1000),
      polymarketTtlSec: Math.round(cache.polymarketTtlMs / 1000),
      oddsMaxSportsPerRefresh: cache.oddsMaxSportsPerRefresh,
      majorSports: cache.majorSports,
    },
    platform: "vercel",
  });
}

export async function HEAD() {
  return new Response(null, { status: 200 });
}
