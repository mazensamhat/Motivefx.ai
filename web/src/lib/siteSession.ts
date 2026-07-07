import type { AuthUser } from "./api";
import { SITE_EMBED } from "./embed";

export { SITE_EMBED } from "./embed";

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

/** Site cookie session — Postgres is the source of truth for entitlements. */
export async function syncSiteEntitlementsFromServer(_force = false): Promise<{
  ok: boolean;
  isAdmin: boolean;
  entitlementsSynced?: boolean;
}> {
  if (!SITE_EMBED) return { ok: false, isAdmin: false };
  const siteUser = await fetchSiteSessionUser();
  return { ok: Boolean(siteUser), isAdmin: Boolean(siteUser?.isAdmin), entitlementsSynced: true };
}
