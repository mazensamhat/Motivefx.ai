import { useCallback, useEffect, useState } from "react";
import { useApi } from "./useApi";
import type { HomeBriefing, TabId } from "../types";

const PULSE_KEY = "motivefx_pulse_ids";

const TAB_TO_MODULE: Record<string, string> = {
  home: "home",
  stocks: "trades",
  penny: "penny",
  crypto: "crypto",
  betting: "betting",
  predictions: "predictions",
};

function readStored(): Record<string, string[]> {
  try {
    return JSON.parse(localStorage.getItem(PULSE_KEY) || "{}");
  } catch {
    return {};
  }
}

function writeStored(data: Record<string, string[]>) {
  localStorage.setItem(PULSE_KEY, JSON.stringify(data));
}

export function useModulePulse(activeTab: TabId) {
  const { data } = useApi<HomeBriefing>("/home/briefing", 60_000);
  const [badges, setBadges] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!data?.opportunities) return;
    const stored = readStored();
    const next: Record<string, number> = {};
    for (const mod of ["trades", "penny", "crypto", "betting", "predictions"]) {
      const modOpps = data.opportunities.filter((o) => o.module === mod);
      const prevIds: string[] = stored[mod] ?? [];
      next[mod] = modOpps.filter((o) => !prevIds.includes(o.id)).length;
    }
    setBadges(next);
  }, [data?.opportunities, data?.generatedAt]);

  const markSeen = useCallback(
    (module: string) => {
      if (!data?.opportunities || module === "home") return;
      const stored = readStored();
      stored[module] = data.opportunities.filter((o) => o.module === module).map((o) => o.id);
      writeStored(stored);
      setBadges((b) => ({ ...b, [module]: 0 }));
    },
    [data?.opportunities]
  );

  useEffect(() => {
    const mod = TAB_TO_MODULE[activeTab];
    if (mod && mod !== "home") {
      markSeen(mod);
    }
  }, [activeTab, markSeen]);

  return { badges, markSeen };
}

export function moduleForTab(tab: TabId): string {
  return TAB_TO_MODULE[tab] ?? tab;
}
