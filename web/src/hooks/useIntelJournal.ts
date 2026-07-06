import { useCallback, useEffect, useState } from "react";
import { apiDelete, apiGet, apiPost, getUserId, hasAuthSession } from "../lib/api";
import { useModules } from "./useModules";
import type { IntelJournalEntry } from "../types";

export function useIntelJournal() {
  const { hasFeature } = useModules();
  const journalEnabled = hasFeature("decision_history");
  const [entries, setEntries] = useState<IntelJournalEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!hasAuthSession() || !journalEnabled) {
      setEntries([]);
      return;
    }
    setLoading(true);
    try {
      const data = await apiGet<{ entries: IntelJournalEntry[] }>(`/home/journal/${getUserId()}`);
      setEntries(data.entries ?? []);
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [journalEnabled]);

  useEffect(() => {
    refresh();
    const onAuth = () => refresh();
    const onJournal = () => refresh();
    const onEntitlements = () => refresh();
    window.addEventListener("motivefx:auth-changed", onAuth);
    window.addEventListener("motivefx:journal-changed", onJournal);
    window.addEventListener("motivefx:entitlements-changed", onEntitlements);
    return () => {
      window.removeEventListener("motivefx:auth-changed", onAuth);
      window.removeEventListener("motivefx:journal-changed", onJournal);
      window.removeEventListener("motivefx:entitlements-changed", onEntitlements);
    };
  }, [refresh]);

  const addEntry = useCallback(
    async (note: string, meta?: { module?: string; symbol?: string; signalTitle?: string }) => {
      if (!hasAuthSession() || !journalEnabled) return false;
      const data = await apiPost<{ entries: IntelJournalEntry[] }>("/home/journal", {
        user_id: getUserId(),
        note,
        module: meta?.module,
        symbol: meta?.symbol,
        signal_title: meta?.signalTitle,
      });
      setEntries(data.entries ?? []);
      window.dispatchEvent(new Event("motivefx:journal-changed"));
      return true;
    },
    [journalEnabled]
  );

  const removeEntry = useCallback(async (id: number) => {
    if (!hasAuthSession()) return;
    const data = await apiDelete<{ entries: IntelJournalEntry[] }>(
      `/home/journal/${getUserId()}/${id}`
    );
    setEntries(data.entries ?? []);
  }, []);

  return { entries, loading, refresh, addEntry, removeEntry };
}
