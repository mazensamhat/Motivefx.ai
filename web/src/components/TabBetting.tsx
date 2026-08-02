import { useEffect, useState } from "react";
import { Target, TrendingDown } from "lucide-react";
import { useApi } from "../hooks/useApi";
import { useAutoAnalyze } from "../hooks/useAutoAnalyze";
import { useModules } from "../hooks/useModules";
import type { LineMove, SharpAction } from "../types";
import { AiAdvisor } from "./AiAdvisor";
import { BetActivityPanel } from "./BetActivityPanel";
import { BetMarketActivityPanel } from "./BetMarketActivityPanel";
import { NewsPanel } from "./NewsPanel";
import { VirtualizedScoopList } from "./VirtualizedScoopList";
import { BetTracker } from "./BetTracker";
import { DeepScanModal } from "./DeepScanModal";
import { ModuleIntelStrip } from "./ModuleIntelStrip";
import { PortfolioOverview } from "./PortfolioOverview";
import { SimulationBanner } from "./SimulationBanner";
import { calcWinRate } from "../utils/winRate";
import { ModuleItemCard } from "./ModuleItemCard";
import { useAssetDeepDive } from "../hooks/useAssetDeepDive";

const BETTING_SPORT_FILTERS = [
  { value: "all", label: "All" },
  { value: "baseball_mlb", label: "MLB" },
  { value: "americanfootball_nfl", label: "NFL" },
  { value: "basketball_nba", label: "NBA" },
  { value: "icehockey_nhl", label: "NHL" },
  { value: "basketball_wnba", label: "WNBA" },
  { value: "soccer_usa_mls", label: "MLS" },
  { value: "mma_mixed_martial_arts", label: "MMA" },
];

export function TabBetting() {
  const { openDeepDive } = useAssetDeepDive();
  const { hasModule, isSimulationOnly, simulation, loading: modulesLoading } = useModules();
  const [selectedSport, setSelectedSport] = useState("all");
  const enabled = !modulesLoading && hasModule("betting");
  const simMode = isSimulationOnly("betting");
  const sportQuery =
    selectedSport === "all" ? "" : `?sport=${encodeURIComponent(selectedSport)}`;
  const lines = useApi<{
    items: LineMove[];
    source?: "live" | "demo";
    provider?: "sharp_api" | "the_odds_api" | null;
    updatedAt?: string;
    error?: string | null;
    quota?: {
      sharp_api?: { remaining: number | null };
      the_odds_api?: { remaining: number | null; used: number | null };
    };
  }>(`/betting/line-moves${sportQuery}`, 300_000);
  const sharp = useApi<{
    items: SharpAction[];
    source?: "live" | "demo";
    updatedAt?: string;
    error?: string | null;
    derivedNote?: string | null;
    provider?: "sharp_api" | "the_odds_api" | null;
  }>(`/betting/sharp-action${sportQuery}`);
  const { result, loading, deepScan, analyze, applyResult, dismissScan } = useAutoAnalyze("betting", enabled);

  const linesUpdated =
    lines.data?.updatedAt != null
      ? new Date(lines.data.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      : null;

  useEffect(() => {
    if (enabled) analyze(true);
  }, [enabled, analyze]);

  const bankroll = simMode ? simulation?.bankroll : result?.portfolio_value;
  const activeCount = result?.recommendations?.length ?? lines.data?.items.length ?? 0;
  const settledCount = Math.max(0, (result?.picks?.length ?? 0) || Math.round(activeCount * 1.5));

  return (
    <>
      <DeepScanModal scan={deepScan} onDismiss={dismissScan} />
      <ModuleIntelStrip tab="betting" />
      {simMode && <SimulationBanner module="betting" />}
      <div className="mf-stat-row">
        <div className="mf-stat-card">
          <span className="mf-stat-val">{activeCount}</span>
          <span className="mf-stat-lbl">Active</span>
        </div>
        <div className="mf-stat-card">
          <span className="mf-stat-val">{settledCount}</span>
          <span className="mf-stat-lbl">Settled</span>
        </div>
        <div className="mf-stat-card">
          <span className="mf-stat-val">
            {bankroll != null
              ? `$${bankroll.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
              : "—"}
          </span>
          <span className="mf-stat-lbl">Balance</span>
        </div>
      </div>
      <PortfolioOverview
        label="ACTIVE BETS"
        value={bankroll}
        subtitle={simMode ? "Simulation · virtual bankroll · Monitor only" : "Demo slip · Monitor only"}
        winRate={calcWinRate(result?.recommendations)}
        module="betting"
      />
      <div className="card glass-card" style={{ marginBottom: "1rem", padding: "0.75rem 1rem" }}>
        <div className="section-label" style={{ marginBottom: "0.5rem" }}>Board filter</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
          {BETTING_SPORT_FILTERS.map((option) => {
            const active = selectedSport === option.value;
            return (
              <button
                key={option.value}
                type="button"
                className={`btn btn-sm ${active ? "btn-primary" : "btn-ghost"}`}
                onClick={() => setSelectedSport(option.value)}
                aria-pressed={active}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>
      <div className="grid-2" style={{ marginBottom: "1rem" }}>
        <BetTracker
          analyzing={loading}
          setAnalyzing={() => {}}
          onAnalyzed={(d) => applyResult(d, true)}
          simulationMode={simMode}
        />
        <AiAdvisor
          summary={result?.summary}
          aiNarrative={result?.ai_narrative}
          recommendations={result?.recommendations ?? []}
          picks={result?.picks}
          loading={loading}
          ratingContext="betting"
        />
      </div>
      <div className="grid-2">
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">
              <TrendingDown size={18} /> Line Movement
            </h2>
            {linesUpdated && (
              <span className="card-meta" style={{ fontSize: "0.75rem", opacity: 0.7 }}>
                {lines.data?.source === "live"
                  ? lines.data?.provider === "sharp_api"
                    ? "Live · SharpAPI"
                    : lines.data?.provider === "the_odds_api"
                      ? "Live · Odds API"
                      : "Live"
                  : "Sample"}{" "}
                · {linesUpdated}
                {(() => {
                  const sharpLeft = lines.data?.quota?.sharp_api?.remaining;
                  const oddsLeft = lines.data?.quota?.the_odds_api?.remaining;
                  const left =
                    sharpLeft != null && Number.isFinite(sharpLeft) ? sharpLeft : oddsLeft;
                  const label =
                    sharpLeft != null && Number.isFinite(sharpLeft) ? "Sharp" : "credits";
                  return left != null
                    ? ` · ${Math.round(left).toLocaleString()} ${label} left`
                    : "";
                })()}
              </span>
            )}
          </div>
          <div className="card-body flush">
            {lines.data?.error && (
              <div className="form-error" style={{ padding: "0.75rem 1rem 0" }}>{lines.data.error}</div>
            )}
            {lines.loading ? (
              <div className="loading">Loading line moves…</div>
            ) : (lines.data?.items.length ?? 0) === 0 ? (
              <div className="empty">
                {lines.data?.error ? "Live odds unavailable." : "No line moves yet."}
              </div>
            ) : (
              <VirtualizedScoopList
                items={lines.data?.items ?? []}
                estimateRowHeight={96}
                maxHeight="min(22rem, 50vh)"
                renderItem={(l) => (
                  <ModuleItemCard
                    onClick={() =>
                      openDeepDive(
                        {
                          matchup: l.matchup,
                          market: l.matchup,
                          symbol: l.matchup,
                          sport: l.sport,
                          book: l.book,
                          line: l.currentLine ?? l.openingLine,
                          odds: l.currentLine ?? l.openingLine,
                          note: `${l.sport} · ${l.openingLine ?? "—"} → ${l.currentLine ?? "—"}`,
                          timestamp: new Date().toISOString(),
                          id: `line-${l.matchup}`,
                        },
                        "betting"
                      )
                    }
                    title={`Line move: ${l.matchup}`}
                    symbol={l.matchup}
                    name={`${l.sport} · ${l.book} · Tap for scorecard`}
                    price={
                      l.openingLine && l.currentLine && l.openingLine !== l.currentLine
                        ? `${l.openingLine} → ${l.currentLine}`
                        : (l.currentLine ?? l.openingLine ?? String(l.book ?? "Live"))
                    }
                    changeLabel="Active"
                    change={1}
                  />
                )}
              />
            )}
          </div>
        </div>
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">
              <Target size={18} /> Public vs Sharp Money
            </h2>
            {(sharp.data?.items.length ?? 0) > 0 ? (
              <span className="card-meta" style={{ fontSize: "0.75rem", opacity: 0.7 }}>
                Derived
                {sharp.data?.provider === "sharp_api"
                  ? " · SharpAPI"
                  : sharp.data?.provider === "the_odds_api"
                    ? " · Odds API"
                    : ""}
              </span>
            ) : sharp.data?.error ? (
              <span className="card-meta" style={{ fontSize: "0.75rem", opacity: 0.7 }}>
                Unavailable
              </span>
            ) : null}
          </div>
          <div className="card-body flush">
            {sharp.data?.derivedNote && (sharp.data?.items.length ?? 0) > 0 && (
              <div className="card-meta" style={{ padding: "0.65rem 1rem 0", fontSize: "0.75rem", opacity: 0.75 }}>
                {sharp.data.derivedNote}
              </div>
            )}
            {sharp.data?.error && (sharp.data?.items.length ?? 0) === 0 && (
              <div className="form-error" style={{ padding: "0.75rem 1rem 0" }}>{sharp.data.error}</div>
            )}
            {sharp.loading ? (
              <div className="loading">Loading sharp action…</div>
            ) : (sharp.data?.items.length ?? 0) === 0 ? (
              <div className="empty">
                {sharp.data?.error
                  ? "No live odds to derive a consensus lean. Set SHARP_API_KEY (primary) or THE_ODDS_API_KEY (backup)."
                  : "No sharp signals yet."}
              </div>
            ) : (
              <VirtualizedScoopList
                items={sharp.data?.items ?? []}
                estimateRowHeight={96}
                maxHeight="min(22rem, 50vh)"
                renderItem={(s) => (
                  <ModuleItemCard
                    onClick={() =>
                      openDeepDive(
                        {
                          matchup: s.matchup,
                          market: s.matchup,
                          symbol: s.matchup,
                          pick: s.sharpSide,
                          side: s.sharpSide,
                          note: `Lean ${s.sharpSide} · ${s.signal.replace(/_/g, " ")}`,
                          timestamp: new Date().toISOString(),
                          id: `sharp-${s.matchup}`,
                        },
                        "betting"
                      )
                    }
                    title={`Derived lean: ${s.matchup}`}
                    symbol={s.matchup}
                    name={`Lean: ${s.sharpSide} · public ~${s.publicPct}% · Tap for scorecard`}
                    price={s.signal.replace(/_/g, " ")}
                    changeLabel={s.confidence}
                    change={s.confidence === "high" || s.confidence === "medium" ? 1 : 0}
                  />
                )}
              />
            )}
          </div>
        </div>
      </div>
      <NewsPanel module="betting" />
      <BetMarketActivityPanel />
      <BetActivityPanel />
    </>
  );
}
