import { useCallback, useEffect, useRef, useState } from "react";
import { apiGet } from "../lib/api";

/** Account-scoped records. Failed reads never mean an empty or deleted ledger. */
export function useSavedLedger<T>(userId: string | undefined, kind: "betting" | "predictions") {
  const [state, setState] = useState<{ owner?: string; rows: T[]; loading: boolean; loaded: boolean; error: string | null }>({ rows: [], loading: true, loaded: false, error: null });
  const generation = useRef(0);
  const reload = useCallback(async () => {
    const seq = ++generation.current;
    if (!userId) { setState({ rows: [], loading: false, loaded: false, error: null }); return false; }
    setState((s) => ({ owner: userId, rows: s.owner === userId ? s.rows : [], loaded: s.owner === userId && s.loaded, loading: true, error: null }));
    try {
      const field = kind === "betting" ? "bets" : "positions";
      const payload = await apiGet<Record<string, unknown>>(`/advisor/${kind}/${field}/${encodeURIComponent(userId)}`);
      if (!Array.isArray(payload[field])) throw new Error("Invalid ledger response");
      if (seq !== generation.current) return false;
      setState({ owner: userId, rows: payload[field] as T[], loaded: true, loading: false, error: null });
      return true;
    } catch {
      if (seq === generation.current) setState((s) => ({ ...s, loading: false, error: "Your saved entries could not be loaded. Nothing was removed. Retry the connection." }));
      return false;
    }
  }, [userId, kind]);
  useEffect(() => {
    void reload();
    const changed = (event: Event) => { if ((event as CustomEvent<{kind?:string}>).detail?.kind === kind) void reload(); };
    window.addEventListener("motivefx:portfolio-changed", changed);
    return () => { generation.current += 1; window.removeEventListener("motivefx:portfolio-changed", changed); };
  }, [reload, kind]);
  return { rows: state.owner === userId ? state.rows : [], loading: state.owner === userId ? state.loading : Boolean(userId), loaded: state.owner === userId && state.loaded, error: state.owner === userId ? state.error : null, reload };
}
