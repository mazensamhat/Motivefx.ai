import { useEffect, useState } from "react";
import { Globe, Trash2, Wand2 } from "lucide-react";
import { apiDelete, apiGet, apiPost } from "../lib/api";
import { useAuth } from "../hooks/useAuth";
import { useModules } from "../hooks/useModules";
import type { AdvisorResult, PredictionMarket } from "../types";
import { useSavedRows } from "../hooks/useSavedRows";
import { PREDICTION_GROUPS, predictionGroup, predictionLabel } from "../lib/positionCategories";
import { TerminalRow } from "./TerminalRow";
interface PositionRow { id: number | string; market: string; category: string; pick: string; stake: number; yes_price?: number; outcome?: string; pnl?: number; is_simulation?: number | boolean; }
interface Props { onAnalyzed: (data: AdvisorResult) => void; analyzing: boolean; setAnalyzing: (v: boolean) => void; simulationMode?: boolean; }
export function PredictionTracker({ onAnalyzed, analyzing, setAnalyzing, simulationMode }: Props) {
  const { isAuthenticated, user, openAuth } = useAuth();
  const { refresh: refreshModules } = useModules();
  const [market, setMarket] = useState("");
  const [category, setCategory] = useState("other");
  const [pick, setPick] = useState("Yes");
  const [stake, setStake] = useState("");
  const [filter, setFilter] = useState("all");
  const owner = isAuthenticated ? user?.userId ?? "" : "";
  const ledger = useSavedRows<PositionRow>(owner ? `/advisor/predictions/positions/${owner}` : "", "positions", owner, "predictions");
  const { rows: positions, setRows: setPositions } = ledger;
  const [markets, setMarkets] = useState<PredictionMarket[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] = useState<string | number | null>(null);
  const [lastResult, setLastResult] = useState<{ won: boolean; pnl: number } | null>(null);
  useEffect(() => {
    let cancelled = false;
    apiGet<{ items: PredictionMarket[] }>("/predictions/markets?limit=20")
      .then((d) => { if (!cancelled) setMarkets(d.items ?? []); }).catch(() => {});
    return () => { cancelled = true; };
  }, []);
  async function addPosition() {
    if (!owner) { openAuth("login"); return; }
    if (!market.trim() || !pick) { setFormError("Enter a market and pick."); return; }
    if (stake && (!Number.isFinite(Number(stake)) || Number(stake) < 0)) { setFormError("Enter a valid non-negative stake."); return; }
    setSaving(true); setFormError(null);
    try {
      const m = markets.find((x) => x.market === market);
      const res = await apiPost<{ simulation?: { won: boolean; pnl: number } }>("/advisor/predictions/positions", {
        user_id: owner, market: market.trim(), category: m?.category || category, pick, stake: stake ? Number(stake) : 0, yes_price: m?.yes ?? 0.5,
      });
      if (res.simulation) { setLastResult(res.simulation); await refreshModules(); }
      setMarket(""); setStake("");
      window.dispatchEvent(new Event("motivefx:briefing-refresh"));
      window.dispatchEvent(new CustomEvent("motivefx:portfolio-changed", { detail: { kind: "predictions" } }));
    } catch (e) { setFormError(e instanceof Error ? e.message : "Could not save position"); }
    finally { setSaving(false); }
  }
  async function removePosition(id: string | number) {
    if (!owner) return;
    setRemovingId(id); setFormError(null);
    const previous = positions; setPositions((rows) => rows.filter((p) => p.id !== id));
    try {
      await apiDelete(`/advisor/predictions/positions/${encodeURIComponent(owner)}/${encodeURIComponent(String(id))}`);
      window.dispatchEvent(new Event("motivefx:briefing-refresh"));
      window.dispatchEvent(new CustomEvent("motivefx:portfolio-changed", { detail: { kind: "predictions" } }));
    } catch (e) { setPositions(previous); setFormError(e instanceof Error ? e.message : "Could not remove prediction"); }
    finally { setRemovingId(null); }
  }
  async function analyze() {
    if (!owner) { openAuth("login"); return; }
    setAnalyzing(true); setFormError(null);
    try { onAnalyzed(await apiPost<AdvisorResult>(`/advisor/predictions/analyze?user_id=${encodeURIComponent(owner)}`, {})); }
    catch (e) { setFormError(e instanceof Error ? e.message : "Analysis failed"); }
    finally { setAnalyzing(false); }
  }
  const visible = positions.filter((p) => filter === "all" || predictionGroup(p.category) === filter);
  return <div className="card glass-card portfolio-ledger">
    <div className="card-header card-header-bold"><h2 className="card-title card-title-lg"><Globe size={18} /> My Predictions</h2>
      <button className="btn btn-accent-terminal btn-sm" onClick={analyze} disabled={analyzing}><Wand2 size={12} />{analyzing ? "Analyzing…" : "AI Analyze"}</button>
    </div>
    <div className="portfolio-form portfolio-form-terminal portfolio-form-predictions">
      <label className="pf-span-4">Category for a new manual position<select aria-label="Category for a new manual position" value={category} onChange={(e) => setCategory(e.target.value)}>
        {PREDICTION_GROUPS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select></label>
      <input className="pf-span-4" list="prediction-markets" placeholder="Market (war, marriage, election…)" value={market} onChange={(e) => { setMarket(e.target.value); const hit = markets.find((m) => m.market === e.target.value); if (hit?.category) setCategory(predictionGroup(hit.category)); }} />
      <datalist id="prediction-markets">{markets.map((m) => <option key={m.market} value={m.market} />)}</datalist>
      <select className="pf-span-2" value={pick} onChange={(e) => setPick(e.target.value)}><option value="Yes">Yes</option><option value="No">No</option></select>
      <input className="pf-span-2" placeholder="Stake $" value={stake} onChange={(e) => setStake(e.target.value)} type="number" />
      <button className="btn btn-form-add pf-span-12" type="button" onClick={addPosition} disabled={saving}>+ {saving ? "Saving…" : simulationMode ? "Add & simulate position" : "Add Position"}</button>
    </div>
    {formError && <div className="form-error" style={{ padding: "0 1rem 0.5rem" }}>{formError}</div>}
    {lastResult && simulationMode && <div className={`simulation-result-toast ${lastResult.won ? "won" : "lost"}`}>Simulation result: {lastResult.won ? "WON" : "LOST"} {lastResult.pnl >= 0 ? "+" : ""}${lastResult.pnl.toFixed(2)}</div>}
    <div className="saved-ledger-tools"><label>Filter saved predictions by category
      <select aria-label="Filter saved predictions by category" value={filter} onChange={(e) => setFilter(e.target.value)}>
        <option value="all">All {positions.length}</option>{PREDICTION_GROUPS.map(([value, label]) => <option key={value} value={value}>{label} ({positions.filter((b) => predictionGroup(b.category) === value).length})</option>)}
      </select></label>
      <button type="button" className="btn btn-sm" disabled={ledger.loading} onClick={() => void ledger.reload()}>Refresh saved positions</button>
    </div>
    {ledger.error && <div role="alert" className="form-error">Saved predictions could not be loaded. {ledger.error} {positions.length > 0 ? "Showing the last successful read." : "This is not an empty-portfolio result."}</div>}
    {ledger.loading && <div className="loading" role="status">Loading saved predictions…</div>}
    <div className="card-body flush terminal-feed">
      {!owner ? <div className="empty">Sign in to save prediction positions to your portfolio ledger. <button type="button" className="btn btn-sm" onClick={() => openAuth("login")}>Sign in</button></div> : <>
        {ledger.verified && !ledger.error && !ledger.loading && positions.length === 0 && <div className="empty">No saved predictions yet. Add a position manually or from a market.</div>}
        {filter !== "all" && positions.length > 0 && visible.length === 0 && <div className="empty">No saved entries in this filter. Select All to see the rest.</div>}
        {visible.map((p) => <TerminalRow key={p.id} tag={{ label: p.outcome ? p.outcome.toUpperCase() : p.pick.toUpperCase(), variant: p.outcome === "won" ? "bullish" : p.outcome === "lost" ? "bearish" : p.pick === "Yes" ? "buy" : "sell" }}
          primary={p.market} secondary={<>{predictionLabel(p.category)} · ${p.stake}{p.yes_price != null ? ` · YES ${(p.yes_price * 100).toFixed(0)}%` : ""}{p.is_simulation ? " · SIM" : ""}</>}
          detail={<div className="saved-position-details"><h3>Saved prediction details</h3><dl>
            <dt>Market</dt><dd>{p.market}</dd><dt>Category</dt><dd>{predictionLabel(p.category)}</dd><dt>Original category</dt><dd>{p.category || "Not provided"}</dd>
            <dt>Selected outcome</dt><dd>{p.pick}</dd><dt>Stake</dt><dd>${p.stake}</dd>
            <dt>Recorded YES price</dt><dd>{p.yes_price == null ? "Not provided" : `${(p.yes_price * 100).toFixed(1)}¢`}</dd><dt>Outcome</dt><dd>{p.outcome || "Unresolved"}</dd>
          </dl><p>Recorded market prices are not calibrated forecast probabilities.</p>
          <button type="button" className="btn" onClick={() => window.dispatchEvent(new CustomEvent("motivefx:ask-open", { detail: { prompt: `Review my recorded prediction: ${p.market}. Selected outcome: ${p.pick}. Category: ${p.category}. Separate saved facts from current evidence you cannot verify.` } }))}>Ask Motive about this prediction</button></div>}
          actions={<button type="button" className="btn-icon btn-icon-danger" aria-label={`Remove ${p.market}`} disabled={removingId === p.id} onClick={(e) => { e.preventDefault(); e.stopPropagation(); void removePosition(p.id); }}><Trash2 size={14} /></button>}
          meta={p.pnl != null ? <span className={p.pnl >= 0 ? "pnl-positive" : "pnl-negative"}>{p.pnl >= 0 ? "+" : ""}${p.pnl.toFixed(2)}</span> : undefined} />)}
      </>}
    </div>
  </div>;
}
