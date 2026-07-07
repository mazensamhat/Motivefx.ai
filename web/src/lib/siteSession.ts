import { setSession, type AuthUser } from "./api";

export const SITE_EMBED = import.meta.env.BASE_URL === "/terminal/";

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
export async function syncSiteEntitlementsFromServer(): Promise<{
  ok: boolean;
  isAdmin: boolean;
}> {
  if (!SITE_EMBED) return { ok: false, isAdmin: false };
  try {
    const res = await fetch("/api/app/session", { cache: "no-store" });
    if (!res.ok) {
      const siteUser = await fetchSiteSessionUser();
      return { ok: false, isAdmin: Boolean(siteUser?.isAdmin) };
    }
    const data = (await res.json()) as {
      ok?: boolean;
      userId?: string;
      email?: string;
      accessToken?: string;
      refreshToken?: string;
      isAdmin?: boolean;
    };
    if (!data.ok || !data.accessToken || !data.refreshToken || !data.userId || !data.email) {
      const siteUser = await fetchSiteSessionUser();
      return { ok: false, isAdmin: Boolean(siteUser?.isAdmin) };
    }
    setSession(data.accessToken, data.refreshToken, {
      userId: data.userId,
      email: data.email,
    });
    return { ok: true, isAdmin: Boolean(data.isAdmin) };
  } catch {
    const siteUser = await fetchSiteSessionUser();
    return { ok: false, isAdmin: Boolean(siteUser?.isAdmin) };
  }
}
