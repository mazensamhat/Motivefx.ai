import { prisma } from "@motivefx/database";
import type { PricingTierId } from "@/lib/tiers";
import { NextResponse } from "next/server";

/** Soft hourly caps for public intel API (Ultra+ / Elite). */
const HOURLY_LIMIT: Record<string, number> = {
  ultra_plus: 600,
  elite: 2000,
};

const WINDOW_MS = 60 * 60 * 1000;

export function apiHourlyLimit(tier: PricingTierId | string): number {
  return HOURLY_LIMIT[tier] ?? HOURLY_LIMIT.ultra_plus;
}

/**
 * Count recent API usage and enforce hourly quota.
 * Records a UsageEvent on every successful check (call after auth).
 */
export async function enforceApiRateLimit(opts: {
  userId: string;
  apiKeyId: string;
  tier: PricingTierId | string;
  endpoint: string;
}): Promise<{ ok: true; remaining: number; limit: number } | { ok: false; response: Response }> {
  const limit = apiHourlyLimit(opts.tier);
  const since = new Date(Date.now() - WINDOW_MS);

  let used = 0;
  try {
    used = await prisma.usageEvent.count({
      where: {
        userId: opts.userId,
        action: "api_v1",
        createdAt: { gte: since },
      },
    });
  } catch {
    /* metering table hiccup — fail open */
    return { ok: true, remaining: limit, limit };
  }

  if (used >= limit) {
    const body = {
      error: `API rate limit exceeded (${limit} requests/hour on ${opts.tier}). Retry after the hour window resets.`,
      limit,
      used,
    };
    const res = NextResponse.json(body, { status: 429 });
    res.headers.set("X-RateLimit-Limit", String(limit));
    res.headers.set("X-RateLimit-Remaining", "0");
    res.headers.set("Retry-After", "3600");
    return { ok: false, response: res };
  }

  void prisma.usageEvent
    .create({
      data: {
        userId: opts.userId,
        module: "api",
        action: "api_v1",
        endpoint: opts.endpoint.slice(0, 200),
        statusCode: 200,
      },
    })
    .catch(() => undefined);

  return { ok: true, remaining: Math.max(0, limit - used - 1), limit };
}

export function withRateLimitHeaders(
  response: Response,
  meta: { remaining: number; limit: number }
): Response {
  const headers = new Headers(response.headers);
  headers.set("X-RateLimit-Limit", String(meta.limit));
  headers.set("X-RateLimit-Remaining", String(meta.remaining));
  return new NextResponse(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
