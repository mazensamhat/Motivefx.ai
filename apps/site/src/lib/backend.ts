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
  entitlementsSynced?: boolean;
}

const sessionCache = new Map<string, { at: number; session: BackendSession }>();
const SESSION_CACHE_MS = 45_000;

export function invalidateBackendSession(email: string) {
  sessionCache.delete(email.trim().toLowerCase());
}

export async function getBackendSession(
  email: string,
  opts?: { force?: boolean }
): Promise<BackendSession | null> {
  const key = email.trim().toLowerCase();
  if (!opts?.force) {
    const cached = sessionCache.get(key);
    if (cached && Date.now() - cached.at < SESSION_CACHE_MS) {
      return cached.session;
    }
  }

  const session = await syncBackendUser(email);
  if (session) {
    sessionCache.set(key, { at: Date.now(), session });
  }
  return session;
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
    signal: AbortSignal.timeout(25_000),
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
    entitlements_synced?: boolean;
    entitlements_error?: string | null;
    plan?: { tier?: string; allowedMarkets?: string[] } | null;
  };

  if (data.entitlements_synced === false) {
    console.error(
      "[backend] entitlements not applied for",
      user.email,
      data.entitlements_error ?? "unknown error"
    );
  }

  return {
    userId: data.user_id,
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    email: data.email,
    entitlementsSynced: data.entitlements_synced !== false,
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
