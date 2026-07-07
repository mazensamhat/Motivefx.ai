import type { AuthUser } from "./api";
import { ensureBackendReady, SITE_EMBED } from "./backendBridge";

export { SITE_EMBED } from "./backendBridge";

export interface SiteSessionUser extends AuthUser {
  isAdmin?: boolean;
}

/** Site cookie session — works even when FastAPI bridge is down. */
export async function fetchSiteSessionUser(): Promise<SiteSessionUser | null> {
  if (!SITE_EMBED) return null;
  try {
    const res = await fetch("/api/auth/me", { cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      user?: { id?: string; email?: string; isAdmin?: boolean };
    };
    const user = data.user;
    if (!user?.email) return null;
    return {
      userId: user.id ?? user.email,
      email: user.email,
      isAdmin: Boolean(user.isAdmin),
    };
  } catch {
    return null;
  }
}

/** Push latest site plan (Ops grants, Stripe, comp) into the FastAPI backend. */
export async function syncSiteEntitlementsFromServer(force = false): Promise<{
  ok: boolean;
  isAdmin: boolean;
  entitlementsSynced?: boolean;
}> {
  if (!SITE_EMBED) return { ok: false, isAdmin: false };
  const result = await ensureBackendReady(force);
  if (result.ok) return result;

  const siteUser = await fetchSiteSessionUser();
  return { ok: false, isAdmin: Boolean(siteUser?.isAdmin), entitlementsSynced: false };
}
