/** Shared cookie-session bootstrap. Service failure is NOT an anonymous session. */
export type AuthMePayload = {
  user?: {
    id?: string; email?: string; isAdmin?: boolean; totpEnabled?: boolean;
    intelligenceTier?: string; selectedMarkets?: string[]; hasSubscription?: boolean;
    [key: string]: unknown;
  };
};
export class AuthLookupUnavailable extends Error {
  constructor() {
    super("We could not verify your session because the service is temporarily unavailable. Your account and plan have not been changed. Please retry.");
    this.name = "AuthLookupUnavailable";
  }
}
export function createAuthMeClient(fetcher: typeof fetch, timeoutMs = 8_000) {
  let cached: AuthMePayload | null = null;
  let resolved = false;
  let expires = 0;
  let generation = 0;
  let inflight: Promise<AuthMePayload | null> | null = null;
  let controller: AbortController | null = null;
  async function read(force = false): Promise<AuthMePayload | null> {
    // Force bypasses a settled cache, never an in-flight request.
    if (inflight) return inflight;
    if (!force && resolved && Date.now() < expires) return cached;
    const epoch = generation;
    const ctrl = new AbortController();
    controller = ctrl;
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    const operation = async () => {
      try {
        const res = await fetcher("/api/auth/me", { cache: "no-store", credentials: "same-origin", signal: ctrl.signal });
        let data: AuthMePayload | null;
        if (res.status === 401) data = null;
        else {
          if (!res.ok) throw new AuthLookupUnavailable();
          const body: unknown = await res.json();
          if (!body || typeof body !== "object" || !("user" in body) || !body.user || typeof body.user !== "object" || !("id" in body.user) || typeof body.user.id !== "string" || !("email" in body.user) || typeof body.user.email !== "string") throw new AuthLookupUnavailable();
          data = body as AuthMePayload;
        }
        if (epoch !== generation) throw new AuthLookupUnavailable();
        cached = data; resolved = true; expires = Date.now() + 15_000;
        return data;
      } catch {
        // Keep any previous cache only for diagnostics; never return it after a failed recheck.
        if (epoch === generation) { resolved = false; expires = 0; }
        throw new AuthLookupUnavailable();
      } finally {
        clearTimeout(timer);
        if (epoch === generation) { inflight = null; controller = null; }
      }
    };
    inflight = operation();
    return inflight;
  }
  function invalidate() {
    generation += 1;
    controller?.abort(); controller = null; inflight = null;
    cached = null; resolved = false; expires = 0;
  }
  return { read, invalidate };
}
const client = createAuthMeClient((input, init) => fetch(input, init));
export const fetchAuthMe = client.read;
export const invalidateAuthMe = client.invalidate;
