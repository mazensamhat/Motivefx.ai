import { useEffect, useState } from "react";
import { Globe, Wand2 } from "lucide-react";
import { apiGet, apiPost, getUserId } from "../lib/api";
import { useAuth } from "../hooks/useAuth";
import { useModules } from "../hooks/useModules";
import type { AdvisorResult, PredictionMarket } from "../types";
import { TerminalRow } from "./TerminalRow";

interface PositionRow {
  id: number | string;
  market: string;
  category: string;
  pick: string;
  stake: number;
  yes_price?: number;
  outcome?: string;
  pnl?: number;
  is_simulation?: number | boolean;
}

interface Props {
  onAnalyzed: (data: AdvisorResult) => void;
  analyzing: boolean;
  setAnalyzing: (v: boolean) => void;
  simulationMode?: boolean;
}

const CATEGORIES = [
  { value: "geopolitics", label: "Geopolitics & War" },
  { value: "politics", label: "Politics" },
  { value: "entertainment", label: "Celebrity & Culture" },
  { value: "economy", label: "Economy & Fed" },
  { value: "science", label: "Science & Tech" },
  { value: "crypto", label: "Crypto Events" },
];

export function PredictionTracker({ onAnalyzed, analyzing, setAnalyzing, simulationMode }: Props) {
  const { isAuthenticated, user, openAuth } = useAuth();
  const { refresh: refreshModules } = useModules();
  const [market, setMarket] = useState("");
  const [category, setCategory] = useState("geopolitics");
  const [pick, setPick] = useState("Yes");
  const [stake, setStake] = useState("");
  const [positions, setPositions] = useState<PositionRow[]>([]);
  const [markets, setMarkets] = useState<PredictionMarket[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [lastResult, setLastResult] = useState<{ won: boolean; pnl: number } | null>(null);

  const userId = user?.userId ?? getUserId();

  useEffect(() => {
    apiGet<{ items: PredictionMarket[] }>("/predictions/markets?limit=20")
      .then((d) => setMarkets(d.items ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      setPositions([]);
      return;
    }
    apiGet<{ positions: PositionRow[] }>(`/advisor/predictions/positions/${userId}`)
      .then((d) => setPositions(d.positions ?? []))
      .catch(() => setPositions([]));
  }, [isAuthenticated, userId]);

  async function addPosition() {
    if (!isAuthenticated) {
      openAuth("login");
      return;
    }
    if (!market.trim() || !pick) {
      setFormError("Enter a market and pick.");
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const m = markets.find((x) => x.market === market);
      const res = await apiPost<{ simulation?: { won: boolean; pnl: number } }>(
        "/advisor/predictions/positions",
        {
          user_id: userId,
          market: market.trim(),
          category,
          pick,
          stake: stake ? parseFloat(stake) : 0,
          yes_price: m?.yes ?? 0.5,
        }
      );
      if (res.simulation) {
        setLastResult({ won: res.simulation.won, pnl: res.simulation.pnl });
        await refreshModules();
      }
      const updated = await apiGet<{ positions: PositionRow[] }>(
        `/advisor/predictions/positions/${userId}`
      );
      setPositions(updated.positions ?? []);
      setMarket("");
      setStake("");
      window.dispatchEvent(new Event("motivefx:briefing-refresh"));
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Could not save position");
    } finally {
      setSaving(false);
    }
  }

  async function analyze() {
    if (!isAuthenticated) {
      openAuth("login");
      return;
    }
    setAnalyzing(true);
    try {
      const data = await apiPost<AdvisorResult>(
        `/advisor/predictions/analyze?user_id=${encodeURIComponent(userId)}`,
        {}
      );
      onAnalyzed(data);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Analysis failed");
    } finally {
      setAnalyzing(false);
    }
  }

  return (
    <div className="card glass-card portfolio-ledger">
      <div className="card-header card-header-bold">
        <h2 className="card-title card-title-lg">
          <Globe size={18} /> My Predictions
        </h2>
        <button className="btn btn-accent-terminal btn-sm" onClick={analyze} disabled={analyzing}>
          <Wand2 size={12} />
          {analyzing ? "Analyzing…" : "AI Analyze"}
        </button>
      </div>

      <div className="portfolio-form portfolio-form-terminal portfolio-form-predictions">
        <select className="pf-span-4" value={category} onChange={(e) => setCategory(e.target.value)}>
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
        <input
          className="pf-span-4"
          list="prediction-markets"
          placeholder="Market (war, marriage, election…)"
          value={market}
          onChange={(e) => {
            setMarket(e.target.value);
            const hit = markets.find((m) => m.market === e.target.value);
            if (hit?.category) setCategory(hit.category);
          }}
        />
        <datalist id="prediction-markets">
          {markets.map((m) => (
            <option key={m.market} value={m.market} />
          ))}
        </datalist>
        <select className="pf-span-2" value={pick} onChange={(e) => setPick(e.target.value)}>
          <option value="Yes">Yes</option>
          <option value="No">No</option>
        </select>
        <input
          className="pf-span-2"
          placeholder="Stake $"
          value={stake}
          onChange={(e) => setStake(e.target.value)}
          type="number"
        />
        <button className="btn btn-form-add pf-span-12" type="button" onClick={addPosition} disabled={saving}>
          + {saving ? "Saving…" : simulationMode ? "Add & simulate position" : "Add Position"}
        </button>
      </div>

      {formError && <div className="form-error" style={{ padding: "0 1rem 0.5rem" }}>{formError}</div>}

      {lastResult && simulationMode && (
        <div className={`simulation-result-toast ${lastResult.won ? "won" : "lost"}`}>
          Simulation result: {lastResult.won ? "WON" : "LOST"}{" "}
          {lastResult.pnl >= 0 ? "+" : ""}${lastResult.pnl.toFixed(2)}
        </div>
      )}

      <div className="card-body flush terminal-feed">
        {!isAuthenticated ? (
          <div className="empty">
            Sign in to save prediction positions to your portfolio ledger.
            <button type="button" className="btn btn-sm" style={{ marginLeft: "0.5rem" }} onClick={() => openAuth("login")}>
              Sign in
            </button>
          </div>
        ) : positions.length === 0 ? (
          <div className="empty">
            {simulationMode
              ? "Pick a market with virtual stake — we simulate the outcome instantly."
              : "Track war, politics, celebrity & event-market bets (Polymarket-style)."}
          </div>
        ) : (
          positions.map((p) => (
            <TerminalRow
              key={p.id}
              tag={{
                label: p.outcome ? p.outcome.toUpperCase() : p.pick.toUpperCase(),
                variant:
                  p.outcome === "won" ? "bullish" : p.outcome === "lost" ? "bearish" : p.pick === "Yes" ? "buy" : "sell",
              }}
              primary={p.market}
              secondary={
                <>
                  {p.category} · ${p.stake}
                  {p.yes_price != null ? ` · YES ${(p.yes_price * 100).toFixed(0)}%` : ""}
                  {p.is_simulation ? " · SIM" : ""}
                </>
              }
              meta={
                p.pnl != null ? (
                  <span className={p.pnl >= 0 ? "pnl-positive" : "pnl-negative"}>
                    {p.pnl >= 0 ? "+" : ""}${p.pnl.toFixed(2)}
                  </span>
                ) : undefined
              }
            />
          ))
        )}
      </div>
    </div>
  );
}
