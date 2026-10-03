import { useCallback, useEffect, useState } from "react";
import { BellRing, History, RefreshCw, RotateCcw } from "lucide-react";
import type { HomeBriefing } from "../types";
import { apiGet, apiPut } from "../lib/api";

type ReplayItem = {
  symbol: string;
  currentSignal: number | null;
  previousSignal: number | null;
  delta: number | null;
  confidence: number | null;
  stance: string | null;
  engineVersion: string | null;
  recordedAt: string | null;
  history: Array<{ motiveSignal: number | null; confidence: number | null; stance: string | null; recordedAt: string }>;
};

type TrackRecordData = {
  generatedAt: string;
  snapshotCount: number;
  pendingOutcomes: number;
  resolvedOutcomes: number;
  minimumResolvedForScore: number;
  readiness: "READY" | "COLLECTING_OUTCOMES";
  score: number | null;
  note: string;
  replay: ReplayItem[];
};

export function MotiveTrackRecord() {
  const [data, setData] = useState<TrackRecordData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await apiGet<TrackRecordData>("/intel/track-record"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Track Record unavailable.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <section className="v2-section v2-trust-section" id="v2-track-record">
      <header className="v2-section-head">
        <div><span className="v2-eyebrow">TRUST LAYER</span><h2><History size={18}/> Motive Track Record</h2></div>
        <button type="button" onClick={() => void load()} disabled={loading}><RefreshCw size={14}/> Refresh</button>
      </header>
      {error ? <p className="v2-warmup" role="alert">{error}</p> : !data ? <p className="loading">Loading recorded signal history…</p> : <>
        <div className="v2-trust-kpis">
          <div><span>Recorded snapshots</span><strong>{data.snapshotCount.toLocaleString()}</strong></div>
          <div><span>Resolved outcomes</span><strong>{data.resolvedOutcomes.toLocaleString()}</strong></div>
          <div><span>Pending outcomes</span><strong>{data.pendingOutcomes.toLocaleString()}</strong></div>
          <div><span>Track Record</span><strong>{data.readiness === "READY" ? "Ready" : "Collecting"}</strong></div>
        </div>
        <p className="v2-trust-note">{data.note}</p>
        <div className="v2-replay-head"><RotateCcw size={16}/><div><strong>Signal Replay</strong><span>Recorded changes in Motive Signal. No hindsight adjustment and no performance score until outcomes resolve.</span></div></div>
        <div className="v2-replay-grid">
          {data.replay.slice(0, 8).map((row) => <article key={row.symbol} className="v2-replay-card">
            <div className="v2-replay-top"><strong>{row.symbol}</strong><span>{row.recordedAt ? new Date(row.recordedAt).toLocaleString() : "—"}</span></div>
            <div className="v2-replay-signal"><span>Motive Signal</span><b>{row.currentSignal != null ? Math.round(row.currentSignal) : "—"}</b><em>/100</em></div>
            <p>{row.delta == null ? "No prior snapshot in this replay window." : `${row.delta >= 0 ? "+" : ""}${row.delta} points vs prior recorded snapshot.`}</p>
            <small>{row.stance ? `Model stance: ${row.stance}` : "Stance unavailable"}{row.confidence != null ? ` · evidence confidence ${Math.round(row.confidence)}/100` : ""}</small>
          </article>)}
        </div>
      </>}
    </section>
  );
}

export function MotiveWatchAgents({ briefing, onPrefsChanged }: { briefing: HomeBriefing; onPrefsChanged?: () => void }) {
  const [busy, setBusy] = useState<string | null>(null);
  const rules = briefing.alertRules ?? [];
  const themes = briefing.themeWatchlist ?? [];
  const enabled = rules.filter((r) => r.enabled).length;

  async function toggle(id: string) {
    setBusy(id);
    try {
      await apiPut("/intel/prefs", {
        prefs: {
          themeWatchlist: themes,
          alertRules: rules.map((r) => r.id === id ? { ...r, enabled: !r.enabled } : r),
        },
      });
      window.dispatchEvent(new Event("motivefx:alerts-refresh"));
      onPrefsChanged?.();
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="v2-section v2-trust-section" id="v2-watch-agents">
      <header className="v2-section-head"><div><span className="v2-eyebrow">WATCH AGENTS</span><h2><BellRing size={18}/> Motive Watch</h2></div></header>
      <div className="v2-trust-kpis">
        <div><span>Active agents</span><strong>{enabled}</strong></div>
        <div><span>Available rules</span><strong>{rules.length}</strong></div>
        <div><span>Watched themes</span><strong>{themes.length}</strong></div>
        <div><span>Delivery</span><strong>Intel alerts</strong></div>
      </div>
      <p className="v2-trust-note">Watch Agents monitor evolving signal rules and surface alerts. They never place orders, trades, or wagers.</p>
      <ul className="v2-agent-list">
        {rules.length ? rules.map((rule) => <li key={rule.id}>
          <div><strong>{rule.label ?? rule.kind}</strong><span>Threshold {rule.threshold} · {rule.enabled ? "watching" : "paused"}</span></div>
          <button type="button" className="btn btn-sm btn-ghost" disabled={busy === rule.id} onClick={() => void toggle(rule.id)}>{rule.enabled ? "Pause" : "Start"}</button>
        </li>) : <li><div><strong>No watch rules configured yet</strong><span>Add themes or predictive rules from Deep Intelligence.</span></div></li>}
      </ul>
    </section>
  );
}
