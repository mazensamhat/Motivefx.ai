import { setSession } from "./api";

export const SITE_EMBED = import.meta.env.BASE_URL === "/terminal/";

/** Push latest site plan (Ops grants, Stripe, comp) into the FastAPI backend. */
export async function syncSiteEntitlementsFromServer(): Promise<{
  ok: boolean;
  isAdmin: boolean;
}> {
  if (!SITE_EMBED) return { ok: false, isAdmin: false };
  try {
    const res = await fetch("/api/app/session", { cache: "no-store" });
    if (!res.ok) return { ok: false, isAdmin: false };
    const data = (await res.json()) as {
      ok?: boolean;
      userId?: string;
      email?: string;
      accessToken?: string;
      refreshToken?: string;
      isAdmin?: boolean;
    };
    if (!data.ok || !data.accessToken || !data.refreshToken || !data.userId || !data.email) {
      return { ok: false, isAdmin: false };
    }
    setSession(data.accessToken, data.refreshToken, {
      userId: data.userId,
      email: data.email,
    });
    return { ok: true, isAdmin: Boolean(data.isAdmin) };
  } catch {
    return { ok: false, isAdmin: false };
  }
}
