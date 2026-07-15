import { useEffect } from "react";
import { getUserId, hasAuthSession } from "../lib/api";
import { isNativeShell, notifyNativeSession } from "../lib/nativeShell";

/** Tell the Expo shell the logged-in user id so RevenueCat can logIn. */
export function NativeIapSessionBridge() {
  useEffect(() => {
    if (!isNativeShell() || !window.ReactNativeWebView) return;
    if (!hasAuthSession()) return;

    const userId = getUserId();
    if (userId && !userId.startsWith("u_")) {
      notifyNativeSession(userId);
    }

    // Also try site cookie session (/api/auth/me) for embed auth.
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/auth/me", { credentials: "include", cache: "no-store" });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as { user?: { id?: string; userId?: string } };
        const id = data.user?.id ?? data.user?.userId;
        if (id) notifyNativeSession(id);
      } catch {
        // not logged in via cookie
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
