import { useEffect, useState } from "react";
import { Ticket, Wand2 } from "lucide-react";
import { apiGet, apiPost, getUserId, hasAuthSession } from "../lib/api";
import { useModules } from "../hooks/useModules";
import type { AdvisorResult } from "../types";
import { TerminalRow } from "./TerminalRow";

interface BetRow {
  id: number;
  matchup: string;
  pick: string;
  odds: string;
  stake: number;
  sport?: string;
  outcome?: string;
  pnl?: number;
  is_simulation?: number;
}

interface Props {
  onAnalyzed: (data: AdvisorResult) => void;
  analyzing: boolean;
  setAnalyzing: (v: boolean) => void;
  simulationMode?: boolean;
}

export function BetTracker({ onAnalyzed, analyzing, setAnalyzing, simulationMode }: Props) {
  const { refresh: refreshModules } = useModules();
  const [matchup, setMatchup] = useState("");
  const [pick, setPick] = useState("");
  const [odds, setOdds] = useState("");
  const [stake, setStake] = useState("");
  const [sport, setSport] = useState("football");
  const [bets, setBets] = useState<BetRow[]>([]);
  const [lastResult, setLastResult] = useState<{ won: boolean; pnl: number } | null>(null);

  useEffect(() => {
    if (!hasAuthSession()) return;
    apiGet<{ bets: typeof bets }>(`/advisor/betting/bets/${getUserId()}`)
      .then((d) => setBets(d.bets ?? []))
      .catch(() => setBets([]));
  }, []);

  async function addBet() {
    if (!hasAuthSession() || !matchup || !pick) return;
    const res = await apiPost<{ simulation?: { won: boolean; pnl: number } }>("/advisor/betting/bets", {
      user_id: getUserId(),
      matchup,
      pick,
      odds,
      stake: stake ? parseFloat(stake) : 0,
      sport,
    });
    if (res.simulation) {
      setLastResult({ won: res.simulation.won, pnl: res.simulation.pnl });
      await refreshModules();
    }
    const updated = await apiGet<{ bets: BetRow[] }>(`/advisor/betting/bets/${getUserId()}`);
    setBets(updated.bets ?? []);
    setMatchup("");
    setPick("");
    setOdds("");
    setStake("");
  }

  async function analyze() {
    setAnalyzing(true);
    try {
      const picks = await apiGet<{ picks: AdvisorResult["picks"] }>("/advisor/betting/picks");
      const analyzed = await apiPost<AdvisorResult>(
        `/advisor/betting/analyze?user_id=${encodeURIComponent(getUserId())}`,
        {}
      );
      onAnalyzed({ ...analyzed, picks: analyzed.picks?.length ? analyzed.picks : picks.picks });
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
          <Ticket size={18} /> My Bets
        </h2>
        <button className="btn btn-accent-terminal btn-sm" onClick={analyze} disabled={analyzing}>
          <Wand2 size={12} />
          {analyzing ? "Analyzing…" : "AI Grade & Picks"}
        </button>
      </div>

      <div className="portfolio-form portfolio-form-terminal portfolio-form-bets">
        <select className="pf-span-3 sport-select" value={sport} onChange={(e) => setSport(e.target.value)}>
          <option value="football">Football</option>
          <option value="basketball">Basketball</option>
          <option value="baseball">Baseball</option>
          <option value="hockey">Hockey</option>
          <option value="soccer">Soccer</option>
          <option value="mma">MMA</option>
          <option value="tennis">Tennis</option>
        </select>
        <input
          className="pf-span-3"
          placeholder="Matchup (Chiefs @ Bills)"
          value={matchup}
          onChange={(e) => setMatchup(e.target.value)}
        />
        <input
          className="pf-span-2"
          placeholder="Your pick (Bills +4.5)"
          value={pick}
          onChange={(e) => setPick(e.target.value)}
        />
        <input
          className="pf-span-2"
          placeholder="Odds (-110)"
          value={odds}
          onChange={(e) => setOdds(e.target.value)}
        />
        <input
          className="pf-span-2"
          placeholder="Stake $"
          value={stake}
          onChange={(e) => setStake(e.target.value)}
          type="number"
        />
        <button className="btn btn-form-add pf-span-12" type="button" onClick={addBet}>
          + {simulationMode ? "Add & simulate bet" : "Add Bet"}
        </button>
      </div>

      {lastResult && simulationMode && (
        <div className={`simulation-result-toast ${lastResult.won ? "won" : "lost"}`}>
          Simulation result: {lastResult.won ? "WON" : "LOST"}{" "}
          {lastResult.pnl >= 0 ? "+" : ""}${lastResult.pnl.toFixed(2)}
        </div>
      )}

      <div className="card-body flush terminal-feed">
        {bets.length === 0 ? (
          <div className="empty">
            {simulationMode
              ? "Log a virtual bet — we settle it instantly against implied odds so you can feel the workflow."
              : "Log your bets — AI grades them against sharp money & line moves."}
          </div>
        ) : (
          bets.map((b) => (
            <TerminalRow
              key={b.id}
              tag={{
                label: b.outcome ? b.outcome.toUpperCase() : (b.sport?.toUpperCase() ?? "BET"),
                variant: b.outcome === "won" ? "bullish" : b.outcome === "lost" ? "bearish" : "neutral",
              }}
              primary={b.matchup}
              secondary={`${b.pick} · ${b.odds} · $${b.stake}${b.is_simulation ? " · SIM" : ""}`}
              meta={
                b.pnl != null ? (
                  <span className={b.pnl >= 0 ? "pnl-positive" : "pnl-negative"}>
                    {b.pnl >= 0 ? "+" : ""}${b.pnl.toFixed(2)}
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
