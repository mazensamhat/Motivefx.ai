import { useCallback, useEffect, useState } from "react";
import { BellRing, History, RefreshCw, RotateCcw } from "lucide-react";
import type { HomeBriefing } from "../types";
import { apiGet, apiPut } from "../lib/api";
import { parseWatchAgentDraft } from "../lib/watchAgentParser";
import { useIntelAlerts } from "../hooks/useIntelAlerts";

type ReplayEvidence = { label: string; score: number | null; provider: string; sourceType: string };
type ReplayOutcome = {
  status: string; realizedReturnPct: number | null; entryPrice: number | null; outcomePrice: number | null;
  evaluatedAt: string | null; notes: string | null;
};
type ReplayPoint = {
  motiveSignal: number | null; confidence: number | null; stance: string | null; recordedAt: string;
  evidence?: ReplayEvidence[]; outcome?: ReplayOutcome | null;
};
type ReplayItem = {
  symbol: string; currentSignal: number | null; previousSignal: number | null; delta: number | null;
  confidence: number | null; stance: string | null; engineVersion: string | null; recordedAt: string | null;
  history: ReplayPoint[];
};
type TrackRecordData = {
  generatedAt: string; snapshotCount: number; pendingOutcomes: number; inconclusiveOutcomes: number;
  resolvedOutcomes: number; minimumResolvedForScore: number; minimumDistinctSymbols: number;
  distinctResolvedSymbols: number; observedAlignment: number | null; readiness: "READY" | "COLLECTING_OUTCOMES";
  score: number | null; note: string; replay: ReplayItem[];
};

export function MotiveTrackRecord() {
  const [data, setData] = useState<TrackRecordData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<ReplayItem | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { setData(await apiGet<TrackRecordData>("/intel/track-record")); }
    catch (e) { setError(e instanceof Error ? e.message : "Track Record unavailable."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  return <section className="v2-section v2-trust-section" id="v2-track-record">
    <header className="v2-section-head">
      <div><span className="v2-eyebrow">TRUST LAYER</span><h2><History size={18}/> Motive Track Record</h2></div>
      <button type="button" onClick={() => void load()} disabled={loading}><RefreshCw size={14}/> Refresh</button>
    </header>
    {error ? <p className="v2-warmup" role="alert">{error}</p> : !data ? <p className="loading">Loading recorded signal history…</p> : <>
      <div className="v2-trust-kpis">
        <div><span>Recorded snapshots</span><strong>{data.snapshotCount.toLocaleString()}</strong></div>
        <div><span>Scored outcomes</span><strong>{data.resolvedOutcomes.toLocaleString()}</strong></div>
        <div><span>Pending / excluded</span><strong>{data.pendingOutcomes.toLocaleString() + " / " + data.inconclusiveOutcomes.toLocaleString()}</strong></div>
        <div><span>Observed alignment</span><strong>{data.observedAlignment != null ? data.observedAlignment + "%" : "Collecting"}</strong></div>
      </div>
      <p className="v2-trust-note">{data.note}</p>
      <div className="v2-replay-head"><RotateCcw size={16}/><div><strong>Signal Replay</strong><span>Recorded Motive Signal and evidence changes. Earlier snapshots are never rewritten after an outcome is known.</span></div></div>
      <div className="v2-replay-grid">
        {data.replay.slice(0, 12).map((row) => <article key={row.symbol} className="v2-replay-card">
          <div className="v2-replay-top"><strong>{row.symbol}</strong><span>{row.recordedAt ? new Date(row.recordedAt).toLocaleString() : "—"}</span></div>
          <div className="v2-replay-signal"><span>Motive Signal</span><b>{row.currentSignal != null ? Math.round(row.currentSignal) : "—"}</b><em>/100</em></div>
          <p>{row.delta == null ? "No prior snapshot in this replay window." : (row.delta >= 0 ? "+" : "") + row.delta + " points vs prior recorded snapshot."}</p>
          <small>{row.stance ? "Model stance: " + row.stance : "Stance unavailable"}{row.confidence != null ? " · evidence confidence " + Math.round(row.confidence) + "/100" : ""}</small>
          <button type="button" className="btn btn-sm btn-ghost" onClick={() => setSelected(row)}>Open replay</button>
        </article>)}
      </div>
      {selected && <div className="v2-replay-timeline">
        <div className="v2-replay-head"><RotateCcw size={16}/><div><strong>{selected.symbol} recorded timeline</strong><span>What Motive knew then, what changed, and any later price-grounded outcome.</span></div><button type="button" className="btn btn-sm btn-ghost" onClick={() => setSelected(null)}>Close</button></div>
        {selected.history.map((point, index) => <article key={point.recordedAt + index}>
          <div><strong>{new Date(point.recordedAt).toLocaleString()}</strong><span>{"Motive Signal " + (point.motiveSignal ?? "—") + "/100 · evidence confidence " + (point.confidence ?? "—") + "/100"}</span></div>
          <ul>{(point.evidence ?? []).map((item, itemIndex) => <li key={itemIndex}>{item.label + (item.score != null ? " " + item.score + "/100" : "") + " · " + item.provider}</li>)}</ul>
          {point.outcome && <p><b>Outcome:</b>{" " + point.outcome.status + (point.outcome.realizedReturnPct != null ? " · " + point.outcome.realizedReturnPct + "% recorded move" : "") + (point.outcome.notes ? " · " + point.outcome.notes : "")}</p>}
        </article>)}
      </div>}
    </>}
  </section>;
}

export function MotiveWatchAgents({ briefing, onPrefsChanged }: { briefing: HomeBriefing; onPrefsChanged?: () => void }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [parseError, setParseError] = useState<string | null>(null);
  const rules = briefing.alertRules ?? [];
  const themes = briefing.themeWatchlist ?? [];
  const agents = briefing.watchAgents ?? [];
  const { alerts } = useIntelAlerts();
  const history = alerts.filter((alert) => alert.title?.startsWith("Watch Agent:")).slice(0, 6);

  async function saveAgents(nextAgents: NonNullable<HomeBriefing["watchAgents"]>) {
    await apiPut("/intel/prefs", { prefs: { themeWatchlist: themes, alertRules: rules, watchAgents: nextAgents } });
    window.dispatchEvent(new Event("motivefx:alerts-refresh"));
    onPrefsChanged?.();
  }
  async function toggleRule(id: string) {
    setBusy(id);
    try {
      await apiPut("/intel/prefs", { prefs: {
        themeWatchlist: themes,
        alertRules: rules.map((rule) => rule.id === id ? { ...rule, enabled: !rule.enabled } : rule),
        watchAgents: agents,
      }});
      onPrefsChanged?.();
    } finally { setBusy(null); }
  }
  async function toggleAgent(id: string) {
    setBusy(id);
    try { await saveAgents(agents.map((agent) => agent.id === id ? { ...agent, enabled: !agent.enabled } : agent)); }
    finally { setBusy(null); }
  }
  async function removeAgent(id: string) {
    setBusy(id);
    try { await saveAgents(agents.filter((agent) => agent.id !== id)); }
    finally { setBusy(null); }
  }
  async function addAgent() {
    const parsed = parseWatchAgentDraft(draft);
    if (!parsed) { setParseError("Try: Watch BTC if Motive Signal falls below 45"); return; }
    setParseError(null); setBusy("new");
    try {
      await saveAgents([...agents, {
        ...parsed,
        id: globalThis.crypto?.randomUUID?.() ?? "agent-" + Date.now(),
        enabled: true,
        createdAt: new Date().toISOString(),
      }]);
      setDraft("");
    } finally { setBusy(null); }
  }

  return <section className="v2-section v2-trust-section" id="v2-watch-agents">
    <header className="v2-section-head"><div><span className="v2-eyebrow">WATCH AGENTS</span><h2><BellRing size={18}/> Motive Watch</h2></div></header>
    <div className="v2-trust-kpis">
      <div><span>Active agents</span><strong>{agents.filter((agent) => agent.enabled).length}</strong></div>
      <div><span>Standard rules</span><strong>{rules.filter((rule) => rule.enabled).length + "/" + rules.length}</strong></div>
      <div><span>Watched themes</span><strong>{themes.length}</strong></div>
      <div><span>Delivery</span><strong>Intel alerts</strong></div>
    </div>
    <p className="v2-trust-note">Custom Watch Agents evaluate recorded evidence every hour. They alert; they never place orders, trades, purchases, or wagers.</p>
    <div className="v2-agent-builder">
      <label><span>Describe a watch</span><input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Watch BTC if Motive Signal falls below 45" maxLength={220}/></label>
      <button type="button" className="v2-primary" disabled={busy === "new" || !draft.trim()} onClick={() => void addAgent()}>Create Watch Agent</button>
    </div>
    {parseError && <p className="form-error" role="alert">{parseError}</p>}
    <h3 className="v2-mini-heading">My agents</h3>
    <ul className="v2-agent-list">
      {agents.length ? agents.map((agent) => <li key={agent.id}>
        <div><strong>{agent.name}</strong><span>{agent.symbol + " · " + agent.metric.replace("_", " ") + " " + agent.operator + " " + agent.threshold + " · " + (agent.enabled ? "watching" : "paused")}</span></div>
        <div><button type="button" className="btn btn-sm btn-ghost" disabled={busy === agent.id} onClick={() => void toggleAgent(agent.id)}>{agent.enabled ? "Pause" : "Start"}</button><button type="button" className="btn btn-sm btn-ghost" disabled={busy === agent.id} onClick={() => void removeAgent(agent.id)}>Delete</button></div>
      </li>) : <li><div><strong>No custom agents yet</strong><span>Create one in plain English above.</span></div></li>}
    </ul>
    <details className="v2-standard-rules"><summary>Standard Motive rules</summary><ul className="v2-agent-list">
      {rules.map((rule) => <li key={rule.id}><div><strong>{rule.label ?? rule.kind}</strong><span>{"Threshold " + rule.threshold + " · " + (rule.enabled ? "watching" : "paused")}</span></div><button type="button" className="btn btn-sm btn-ghost" disabled={busy === rule.id} onClick={() => void toggleRule(rule.id)}>{rule.enabled ? "Pause" : "Start"}</button></li>)}
    </ul></details>
    <h3 className="v2-mini-heading">Recent agent history</h3>
    <div className="v2-agent-history">{history.length ? history.map((alert) => <article key={alert.id}><strong>{alert.title}</strong><p>{alert.body ?? "Triggered from recorded evidence."}</p><small>{alert.created_at ? new Date(alert.created_at).toLocaleString() : "Recent alert"}</small></article>) : <p className="v2-trust-note">No Watch Agent triggers recorded yet.</p>}</div>
  </section>;
}
