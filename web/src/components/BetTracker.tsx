import { useState } from "react";
import { Ticket, Trash2, Wand2 } from "lucide-react";
import { apiDelete, apiGet, apiPost } from "../lib/api";
import { useAuth } from "../hooks/useAuth";
import { useModules } from "../hooks/useModules";
import type { AdvisorResult } from "../types";
import { useSavedRows } from "../hooks/useSavedRows";
import { SPORT_GROUPS, sportGroup, sportLabel } from "../lib/positionCategories";
import { TerminalRow } from "./TerminalRow";
interface BetRow {
  id: number | string; matchup: string; pick: string; odds: string | null; stake: number | null;
  sport?: string; sportsbook?: string | null; created_at?: string; status?: string;
  outcome?: string; pnl?: number; is_simulation?: number | boolean;
}
interface Props { onAnalyzed: (data: AdvisorResult) => void; analyzing: boolean; setAnalyzing: (v: boolean) => void; simulationMode?: boolean; }
export function BetTracker({ onAnalyzed, analyzing, setAnalyzing, simulationMode }: Props) {
  const { isAuthenticated, user, openAuth } = useAuth();
  const { refresh: refreshModules } = useModules();
  const [matchup, setMatchup] = useState("");
  const [pick, setPick] = useState("");
  const [odds, setOdds] = useState("");
  const [stake, setStake] = useState("");
  const [sport, setSport] = useState("other");
  const [filter, setFilter] = useState("all");
  const owner = isAuthenticated ? user?.userId ?? "" : "";
  const ledger = useSavedRows<BetRow>(owner ? `/advisor/betting/bets/${owner}` : "", "bets", owner, "betting");
  const { rows: bets, setRows: setBets } = ledger;
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] = useState<string | number | null>(null);
  const [lastResult, setLastResult] = useState<{ won: boolean; pnl: number } | null>(null);
  async function addBet() {
    if (!owner) { openAuth("login"); return; }
    if (!matchup.trim() || !pick.trim()) { setFormError("Enter a matchup and pick."); return; }
    if (stake && (!Number.isFinite(Number(stake)) || Number(stake) < 0)) { setFormError("Enter a valid non-negative stake."); return; }
    setSaving(true); setFormError(null);
    try {
      const res = await apiPost<{ simulation?: { won: boolean; pnl: number } }>("/advisor/betting/bets", {
        user_id: owner, matchup: matchup.trim(), pick: pick.trim(), odds: odds.trim() || "-110", stake: stake ? Number(stake) : 0, sport,
      });
      if (res.simulation) { setLastResult(res.simulation); await refreshModules(); }
      setMatchup(""); setPick(""); setOdds(""); setStake("");
      window.dispatchEvent(new Event("motivefx:briefing-refresh"));
      window.dispatchEvent(new CustomEvent("motivefx:portfolio-changed", { detail: { kind: "betting" } }));
    } catch (e) { setFormError(e instanceof Error ? e.message : "Could not save bet"); }
    finally { setSaving(false); }
  }
  async function removeBet(id: string | number) {
    if (!owner) return;
    setRemovingId(id); setFormError(null);
    const previous = bets; setBets((rows) => rows.filter((b) => b.id !== id));
    try {
      await apiDelete(`/advisor/betting/bets/${encodeURIComponent(owner)}/${encodeURIComponent(String(id))}`);
      window.dispatchEvent(new Event("motivefx:briefing-refresh"));
      window.dispatchEvent(new CustomEvent("motivefx:portfolio-changed", { detail: { kind: "betting" } }));
    } catch (e) { setBets(previous); setFormError(e instanceof Error ? e.message : "Could not remove bet"); }
    finally { setRemovingId(null); }
  }
  async function analyze() {
    if (!owner) { openAuth("login"); return; }
    setAnalyzing(true); setFormError(null);
    try {
      const picks = await apiGet<{ picks: AdvisorResult["picks"] }>("/advisor/betting/picks");
      const analyzed = await apiPost<AdvisorResult>(`/advisor/betting/analyze?user_id=${encodeURIComponent(owner)}`, {});
      onAnalyzed({ ...analyzed, picks: analyzed.picks?.length ? analyzed.picks : picks.picks });
    } catch (e) { setFormError(e instanceof Error ? e.message : "Analysis failed"); }
    finally { setAnalyzing(false); }
  }
  const visible = bets.filter((b) => filter === "all" || sportGroup(b.sport) === filter);
  return <div className="card glass-card portfolio-ledger">
    <div className="card-header card-header-bold"><h2 className="card-title card-title-lg"><Ticket size={18} /> My Bets</h2>
      <button className="btn btn-accent-terminal btn-sm" onClick={analyze} disabled={analyzing}><Wand2 size={12} />{analyzing ? "Analyzing…" : "AI Grade & Picks"}</button>
    </div>
    <div className="portfolio-form portfolio-form-terminal portfolio-form-bets">
      <label className="pf-span-3">Sport for a new manual bet<select aria-label="Sport for a new manual bet" className="sport-select" value={sport} onChange={(e) => setSport(e.target.value)}>
        {SPORT_GROUPS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select></label>
      <input className="pf-span-3" placeholder="Matchup (Chiefs @ Bills)" value={matchup} onChange={(e) => setMatchup(e.target.value)} />
      <input className="pf-span-2" placeholder="Your pick (Bills +4.5)" value={pick} onChange={(e) => setPick(e.target.value)} />
      <input className="pf-span-2" placeholder="Odds (-110)" value={odds} onChange={(e) => setOdds(e.target.value)} />
      <input className="pf-span-2" placeholder="Stake $" value={stake} onChange={(e) => setStake(e.target.value)} type="number" />
      <button className="btn btn-form-add pf-span-12" type="button" onClick={addBet} disabled={saving}>+ {saving ? "Saving…" : simulationMode ? "Add & simulate bet" : "Add Bet"}</button>
    </div>
    {formError && <div className="form-error" style={{ padding: "0 1rem 0.5rem" }}>{formError}</div>}
    {lastResult && simulationMode && <div className={`simulation-result-toast ${lastResult.won ? "won" : "lost"}`}>Simulation result: {lastResult.won ? "WON" : "LOST"} {lastResult.pnl >= 0 ? "+" : ""}${lastResult.pnl.toFixed(2)}</div>}
    <div className="saved-ledger-tools"><label>Filter saved bets by sport
      <select aria-label="Filter saved bets by sport" value={filter} onChange={(e) => setFilter(e.target.value)}>
        <option value="all">All {bets.length}</option>{SPORT_GROUPS.map(([value, label]) => <option key={value} value={value}>{label} ({bets.filter((b) => sportGroup(b.sport) === value).length})</option>)}
      </select></label>
      <button type="button" className="btn btn-sm" disabled={ledger.loading} onClick={() => void ledger.reload()}>Refresh saved bets</button>
    </div>
    {ledger.error && <div role="alert" className="form-error">Saved bets could not be loaded. {ledger.error} {bets.length > 0 ? "Showing the last successful read." : "This is not an empty-portfolio result."}</div>}
    {ledger.loading && <div className="loading" role="status">Loading saved bets…</div>}
    <div className="card-body flush terminal-feed">
      {!owner ? <div className="empty">Sign in to save bets to your portfolio ledger. <button type="button" className="btn btn-sm" onClick={() => openAuth("login")}>Sign in</button></div> : <>
        {ledger.verified && !ledger.error && !ledger.loading && bets.length === 0 && <div className="empty">{simulationMode ? "Log a virtual bet to simulate it." : "No saved bets yet. Add one manually or from a sportsbook list."}</div>}
        {filter !== "all" && bets.length > 0 && visible.length === 0 && <div className="empty">No saved entries in this filter. Select All to see the rest.</div>}
        {visible.map((b) => <TerminalRow key={b.id} tag={{ label: b.outcome ? b.outcome.toUpperCase() : sportLabel(b.sport).toUpperCase(), variant: b.outcome === "won" ? "bullish" : b.outcome === "lost" ? "bearish" : "neutral" }}
          primary={b.matchup} secondary={`${b.pick} · ${b.odds ?? "Odds unavailable"} · ${b.stake == null ? "Stake not set" : `$${b.stake}`}${b.is_simulation ? " · SIM" : ""}`}
          detail={<div className="saved-position-details"><h3>Saved bet details</h3><dl>
            <dt>Sport</dt><dd>{sportLabel(b.sport)}</dd><dt>League / source sport</dt><dd>{b.sport || "Not provided"}</dd>
            <dt>Matchup</dt><dd>{b.matchup}</dd><dt>Pick</dt><dd>{b.pick}</dd><dt>Recorded odds</dt><dd>{b.odds || "Not provided"}</dd>
            <dt>Stake</dt><dd>{b.stake == null ? "Not provided" : `$${b.stake}`}</dd><dt>Sportsbook</dt><dd>{b.sportsbook || "Not provided"}</dd>
            <dt>Status</dt><dd>{b.status || (b.outcome ? "Settled" : "Open")}</dd><dt>Outcome</dt><dd>{b.outcome || "Unresolved"}</dd>
          </dl><p>These are your saved details, not refreshed odds or an AI recommendation.</p>
          <button type="button" className="btn" onClick={() => window.dispatchEvent(new CustomEvent("motivefx:ask-open", { detail: { prompt: `Review my recorded ${b.sport || "sports"} bet: ${b.matchup}. Pick: ${b.pick}. Recorded odds: ${b.odds || "not provided"}. Separate saved facts from anything you cannot verify.` } }))}>Ask Motive about this bet</button></div>}
          actions={<button type="button" className="btn-icon btn-icon-danger" aria-label={`Remove ${b.matchup}`} disabled={removingId === b.id} onClick={(e) => { e.preventDefault(); e.stopPropagation(); void removeBet(b.id); }}><Trash2 size={14} /></button>}
          meta={b.pnl != null ? <span className={b.pnl >= 0 ? "pnl-positive" : "pnl-negative"}>{b.pnl >= 0 ? "+" : ""}${b.pnl.toFixed(2)}</span> : undefined} />)}
      </>}
    </div>
  </div>;
}
