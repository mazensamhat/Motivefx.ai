import { useCallback, useEffect, useRef, useState } from "react";
import { apiGet, apiPost, getUserId, hasAuthSession } from "../lib/api";
import type { IntelAlert } from "../types";
import { dispatchIntelToast } from "./useIntelToast";
import { useModules } from "./useModules";

export function useIntelAlerts() {
  const { hasFeature } = useModules();
  const alertsEnabled = hasFeature("push_notifications");
  const [alerts, setAlerts] = useState<IntelAlert[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const prevUnread = useRef(0);
  const initialized = useRef(false);

  const notifyNew = useCallback((count: number, latest?: IntelAlert) => {
    if (count <= prevUnread.current) return;
    const delta = count - prevUnread.current;
    const msg =
      latest?.title ??
      `${delta} new intel alert${delta === 1 ? "" : "s"} on your radar`;
    dispatchIntelToast({
      message: msg,
      actionLabel: "View",
      onAction: () => {
        window.dispatchEvent(new CustomEvent("motivefx:open-alerts"));
      },
    });
    if (
      localStorage.getItem("motivefx_browser_alerts") === "1" &&
      typeof Notification !== "undefined" &&
      Notification.permission === "granted"
    ) {
      try {
        new Notification("MotiveFX intel alert", { body: latest?.body ?? msg });
      } catch {
        /* ignore */
      }
    }
  }, []);

  const refresh = useCallback(async () => {
    if (!hasAuthSession() || !alertsEnabled) {
      setAlerts([]);
      setUnreadCount(0);
      prevUnread.current = 0;
      return;
    }
    setLoading(true);
    try {
      const data = await apiGet<{ alerts: IntelAlert[]; unreadCount: number }>(
        `/home/alerts/${getUserId()}`
      );
      const list = data.alerts ?? [];
      const unread = data.unreadCount ?? 0;
      const latestUnread = list.find((a) => !a.seen);
      if (initialized.current) {
        notifyNew(unread, latestUnread);
      } else {
        initialized.current = true;
      }
      prevUnread.current = unread;
      setAlerts(list);
      setUnreadCount(unread);
    } catch {
      setAlerts([]);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  }, [notifyNew, alertsEnabled]);

  useEffect(() => {
    refresh();
    const onAuth = () => refresh();
    const onRefresh = () => refresh();
    const onEntitlements = () => refresh();
    window.addEventListener("motivefx:auth-changed", onAuth);
    window.addEventListener("motivefx:alerts-refresh", onRefresh);
    window.addEventListener("motivefx:entitlements-changed", onEntitlements);
    return () => {
      window.removeEventListener("motivefx:auth-changed", onAuth);
      window.removeEventListener("motivefx:alerts-refresh", onRefresh);
      window.removeEventListener("motivefx:entitlements-changed", onEntitlements);
    };
  }, [refresh]);

  const markSeen = useCallback(async (alertId: number) => {
    if (!hasAuthSession() || !alertsEnabled) return;
    const data = await apiPost<{ alerts: IntelAlert[]; unreadCount: number }>(
      `/home/alerts/${getUserId()}/${alertId}/seen`,
      {}
    );
    setAlerts(data.alerts ?? []);
    setUnreadCount(data.unreadCount ?? 0);
    prevUnread.current = data.unreadCount ?? 0;
  }, [alertsEnabled]);

  const markAllSeen = useCallback(async () => {
    if (!hasAuthSession() || !alertsEnabled) return;
    const data = await apiPost<{ alerts: IntelAlert[]; unreadCount: number }>(
      `/home/alerts/${getUserId()}/seen-all`,
      {}
    );
    setAlerts(data.alerts ?? []);
    setUnreadCount(0);
    prevUnread.current = 0;
  }, [alertsEnabled]);

  return { alerts, unreadCount, loading, refresh, markSeen, markAllSeen };
}
