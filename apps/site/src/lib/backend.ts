import { prisma } from "@motivefx/database";
import { userHasActiveSubscription } from "@/lib/subscription-access";

const SITE_MARKET_TO_BACKEND: Record<string, string> = {
  stocks: "trades",
  crypto: "crypto",
  pink_slips: "penny",
  sports_betting: "betting",
  prediction_markets: "predictions",
};

export function getBackendApiUrl() {
  return process.env.MOTIVEFX_API_URL?.trim() || "http://127.0.0.1:8001";
}

export function mapMarketsToBackend(markets: string[]) {
  return markets
    .map((m) => SITE_MARKET_TO_BACKEND[m] ?? m)
    .filter(Boolean);
}

export interface BackendSession {
  userId: string;
  accessToken: string;
  refreshToken: string;
  email: string;
}

export async function syncBackendUser(email: string): Promise<BackendSession | null> {
  const secret = process.env.BACKEND_SYNC_SECRET?.trim();
  if (!secret) {
    console.warn("[backend] BACKEND_SYNC_SECRET not set — FastAPI tools disabled");
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
    select: {
      email: true,
      intelligenceTier: true,
      selectedMarkets: true,
      subscriptionStatus: true,
      stripeSubscriptionId: true,
      accessExpiresAt: true,
      disabledAt: true,
    },
  });
  if (!user) return null;

  let selectedMarkets: string[] = [];
  try {
    const parsed = JSON.parse(user.selectedMarkets ?? "[]") as unknown;
    if (Array.isArray(parsed)) selectedMarkets = parsed.filter((m) => typeof m === "string");
  } catch {
    selectedMarkets = [];
  }

  const res = await fetch(`${getBackendApiUrl()}/api/internal/sync-site-user`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Backend-Sync-Secret": secret,
    },
    body: JSON.stringify({
      email: user.email,
      display_name: user.email.split("@")[0],
      intelligence_tier: user.intelligenceTier,
      selected_markets: selectedMarkets,
      subscription_active: userHasActiveSubscription(user),
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    console.error("[backend] sync failed", res.status, await res.text().catch(() => ""));
    return null;
  }

  const data = (await res.json()) as {
    user_id: string;
    access_token: string;
    refresh_token: string;
    email: string;
  };

  return {
    userId: data.user_id,
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    email: data.email,
  };
}

export async function fetchBackendJson<T>(
  path: string,
  backend: BackendSession,
  init?: RequestInit
): Promise<T | null> {
  const url = `${getBackendApiUrl()}${path.startsWith("/") ? path : `/${path}`}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${backend.accessToken}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
  if (!res.ok) {
    console.error("[backend] fetch failed", path, res.status);
    return null;
  }
  return res.json() as Promise<T>;
}
