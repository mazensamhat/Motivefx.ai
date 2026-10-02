import { useCallback, useEffect, useRef, useState, type SetStateAction } from "react";
import { apiGet } from "../lib/api";

/** Account-scoped saved data. A failed read must never masquerade as an empty ledger. */
export function useSavedRows<T>(path: string, field: string, owner: string, kind: string) {
  const key = `${owner}:${path}`;
  const latest = useRef(key); latest.current = key;
  const version = useRef(0);
  const [state, setState] = useState<{ key: string; rows: T[]; loading: boolean; error: string | null; verified: boolean }>({ key, rows: [], loading: !!path, error: null, verified: false });
  const reload = useCallback(async (): Promise<T[] | null> => {
    if (!path || !owner) return null;
    const ticket = ++version.current;
    setState((s) => ({ ...s, loading: true }));
    try {
      const data = await apiGet<Record<string, unknown>>(path);
      if (!Array.isArray(data?.[field])) throw new Error("Saved data returned an incomplete response. Please retry.");
      if (latest.current !== key || version.current !== ticket) return null;
      const rows = data[field] as T[];
      setState({ key, rows, loading: false, error: null, verified: true });
      return rows;
    } catch (e) {
      if (latest.current === key && version.current === ticket) {
        setState((s) => ({ ...s, key, loading: false, error: e instanceof Error ? e.message : "Saved data is unavailable. Please retry." }));
      }
      return null;
    }
  }, [path, owner, field, key]);
  const setRows = useCallback((next: SetStateAction<T[]>) => {
    if (latest.current !== key) return;
    ++version.current;
    setState((s) => ({ ...s, rows: typeof next === "function" ? (next as (rows: T[]) => T[])(s.rows) : next, loading: false }));
  }, [key]);
  useEffect(() => {
    ++version.current;
    setState({ key, rows: [], loading: !!path, error: null, verified: false });
    void reload();
    const changed = (e: Event) => {
      const changedKind = (e as CustomEvent<{ kind?: string }>).detail?.kind;
      if (changedKind === kind) void reload();
    };
    window.addEventListener("motivefx:portfolio-changed", changed);
    return () => { ++version.current; window.removeEventListener("motivefx:portfolio-changed", changed); };
  }, [key, path, kind, reload]);
  const current = state.key === key;
  return { rows: current ? state.rows : [], setRows, reload,
    loading: current ? state.loading : !!path, error: current ? state.error : null,
    verified: current && state.verified,
    writable: current && state.verified && !state.error && !state.loading };
}
