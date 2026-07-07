import { setSession } from "./api";

export const SITE_EMBED = import.meta.env.BASE_URL === "/terminal/";

export interface BackendSyncResult {
  ok: boolean;
  isAdmin: boolean;
  entitlementsSynced?: boolean;
}

let inflight: Promise<BackendSyncResult> | null = null;
let lastSyncAt = 0;
const SYNC_TTL_MS = 20_000;

export function isModuleLockMessage(msg: string): boolean {
  return (
    msg.includes("Subscribe to unlock") ||
    msg.includes("not included in your plan") ||
    msg.includes("Upgrade your plan")
  );
}

/** Bridge site cookie → FastAPI tokens + push Ops tier to Render SQLite. */
export async function ensureBackendReady(force = false): Promise<BackendSyncResult> {
  if (!SITE_EMBED) return { ok: false, isAdmin: false };

  const now = Date.now();
  if (!force && inflight) return inflight;
  if (!force && now - lastSyncAt < SYNC_TTL_MS) {
    return { ok: true, isAdmin: false, entitlementsSynced: true };
  }

  inflight = (async (): Promise<BackendSyncResult> => {
    try {
      const res = await fetch("/api/app/session", { cache: "no-store" });
      if (!res.ok) {
        return { ok: false, isAdmin: false, entitlementsSynced: false };
      }
      const data = (await res.json()) as {
        ok?: boolean;
        userId?: string;
        email?: string;
        accessToken?: string;
        refreshToken?: string;
        isAdmin?: boolean;
        entitlementsSynced?: boolean;
      };
      if (!data.ok || !data.accessToken || !data.refreshToken || !data.userId || !data.email) {
        return { ok: false, isAdmin: false, entitlementsSynced: false };
      }
      setSession(data.accessToken, data.refreshToken, {
        userId: data.userId,
        email: data.email,
      });
      lastSyncAt = Date.now();
      return {
        ok: true,
        isAdmin: Boolean(data.isAdmin),
        entitlementsSynced: data.entitlementsSynced !== false,
      };
    } catch {
      return { ok: false, isAdmin: false, entitlementsSynced: false };
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}
