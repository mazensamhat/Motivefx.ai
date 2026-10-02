/** Single-flight session lookup. Only a real 401 is a signed-out result. */
export type AuthMePayload = { user?: { id?: string; email?: string; isAdmin?: boolean;
  totpEnabled?: boolean; intelligenceTier?: string; selectedMarkets?: string[];
  hasSubscription?: boolean; [key: string]: unknown } };
export class SessionLookupError extends Error {
  constructor(message = "We could not verify your session. Your saved data has not been cleared. Please retry.") {
    super(message); this.name = "SessionLookupError";
  }
}
const TTL_MS = 15_000;
let generation = 0;
let cached: { data: AuthMePayload | null; expires: number } | null = null;
let inflight: Promise<AuthMePayload | null> | null = null;
export async function fetchAuthMe(force = false): Promise<AuthMePayload | null> {
  // Even forced callers join one active lookup instead of multiplying DB queries.
  if (inflight) return inflight;
  if (!force && cached && cached.expires > Date.now()) return cached.data;
  const epoch = generation;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 12_000);
  const request = (async () => {
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store", credentials: "same-origin", signal: ctrl.signal });
      let data: AuthMePayload | null = null;
      if (res.status !== 401) {
        if (!res.ok) throw new SessionLookupError();
        data = await res.json() as AuthMePayload;
        if (!data?.user?.id || !data.user.email) throw new SessionLookupError("The session response was incomplete. Please retry.");
      }
      if (generation !== epoch) throw new SessionLookupError("The session changed. Please retry.");
      cached = { data, expires: Date.now() + (data ? TTL_MS : 1_000) };
      return data;
    } catch (e) {
      // Never turn outages, invalid JSON or a timeout into a signed-out user.
      throw e instanceof SessionLookupError ? e : new SessionLookupError();
    } finally { clearTimeout(timer); }
  })();
  inflight = request;
  try { return await request; }
  finally { if (inflight === request) inflight = null; }
}
export function invalidateAuthMe() { generation++; cached = null; inflight = null; }
