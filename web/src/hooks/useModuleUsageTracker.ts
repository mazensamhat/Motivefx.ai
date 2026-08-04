import { useEffect, useRef } from "react";
import type { TabId } from "../types";
import { getAccessToken, hasAuthSession } from "../lib/api";

const TAB_TO_MODULE: Record<TabId, string> = {
  home: "home",
  stocks: "trades",
  crypto: "crypto",
  betting: "betting",
  penny: "penny",
  predictions: "predictions",
};

/**
 * Posts module-open events for Ops heatmaps / utilization.
 * Uses cookie session on site embed and Bearer JWT on native / standalone.
 */
export function useModuleUsageTracker(activeTab: TabId) {
  const lastSent = useRef<string | null>(null);

  useEffect(() => {
    if (!hasAuthSession()) return;
    const moduleId = TAB_TO_MODULE[activeTab];
    if (!moduleId) return;
    if (lastSent.current === moduleId) return;
    lastSent.current = moduleId;

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    const token = getAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;

    void fetch("/api/module-usage", {
      method: "POST",
      credentials: "include",
      headers,
      body: JSON.stringify({ moduleId, action: "open" }),
    }).catch(() => undefined);
  }, [activeTab]);
}
