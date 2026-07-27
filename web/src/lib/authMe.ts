/**
 * Single-flight + short TTL for /api/auth/me.
 * On reload the app used to fire this 4–6 times in parallel and abort at 8s.
 */

export type AuthMePayload = {
  user?: {
    id?: string;
    email?: string;
    isAdmin?: boolean;
    totpEnabled?: boolean;
    intelligenceTier?: string;
    selectedMarkets?: string[];
    hasSubscription?: boolean;
    [key: string]: unknown;
  };
};

type Cache = {
  data: AuthMePayload | null;
  expires: number;
  inflight: Promise<AuthMePayload | null> | null;
};

const TTL_MS = 15_000;
const FETCH_MS = 25_000;

const g = globalThis as unknown as { __motivefxAuthMe?: Cache };
if (!g.__motivefxAuthMe) {
  g.__motivefxAuthMe = { data: null, expires: 0, inflight: null };
}

async function fetchAuthMeOnce(): Promise<AuthMePayload | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_MS);
  try {
    const res = await fetch("/api/auth/me", {
      cache: "no-store",
      credentials: "same-origin",
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    return (await res.json()) as AuthMePayload;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Shared /api/auth/me — dedupes concurrent callers during boot/reload. */
export async function fetchAuthMe(force = false): Promise<AuthMePayload | null> {
  const cache = g.__motivefxAuthMe!;
  const now = Date.now();
  if (!force && cache.data && cache.expires > now) return cache.data;
  if (!force && cache.inflight) return cache.inflight;

  const inflight = fetchAuthMeOnce()
    .then((data) => {
      cache.data = data;
      cache.expires = Date.now() + TTL_MS;
      cache.inflight = null;
      return data;
    })
    .catch(() => {
      cache.inflight = null;
      return null;
    });

  cache.inflight = inflight;
  return inflight;
}

export function invalidateAuthMe() {
  const cache = g.__motivefxAuthMe!;
  cache.data = null;
  cache.expires = 0;
  cache.inflight = null;
}
