import { useEffect } from "react";
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
import { useSignalDetail } from "../hooks/useSignalDetail";
import { lineMoveDetail, sharpMoneyDetail } from "../utils/signalIntel";

export function TabBetting() {
  const { inspectDetail } = useSignalDetail();
  const { hasModule, isSimulationOnly, simulation, loading: modulesLoading } = useModules();
  const enabled = !modulesLoading && hasModule("betting");
  const simMode = isSimulationOnly("betting");
  const lines = useApi<{ items: LineMove[] }>("/betting/line-moves");
  const sharp = useApi<{ items: SharpAction[] }>("/betting/sharp-action");
  const { result, loading, deepScan, analyze, applyResult, dismissScan } = useAutoAnalyze("betting", enabled);

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
          </div>
          <div className="card-body flush">
            {lines.loading ? (
              <div className="loading">Loading line moves…</div>
            ) : (lines.data?.items.length ?? 0) === 0 ? (
              <div className="empty">No line moves yet.</div>
            ) : (
              <VirtualizedScoopList
                items={lines.data?.items ?? []}
                estimateRowHeight={96}
                maxHeight="min(22rem, 50vh)"
                renderItem={(l) => (
                  <ModuleItemCard
                    onClick={() => inspectDetail(lineMoveDetail(l))}
                    title={`Line move: ${l.matchup}`}
                    symbol={l.matchup}
                    name={`${l.sport} · ${l.book}`}
                    price={`${l.openingLine} → ${l.currentLine}`}
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
          </div>
          <div className="card-body flush">
            {sharp.loading ? (
              <div className="loading">Loading sharp action…</div>
            ) : (sharp.data?.items.length ?? 0) === 0 ? (
              <div className="empty">No sharp signals yet.</div>
            ) : (
              <VirtualizedScoopList
                items={sharp.data?.items ?? []}
                estimateRowHeight={96}
                maxHeight="min(22rem, 50vh)"
                renderItem={(s) => (
                  <ModuleItemCard
                    onClick={() => inspectDetail(sharpMoneyDetail(s))}
                    title={`Sharp money: ${s.matchup}`}
                    symbol={s.matchup}
                    name={`Sharp: ${s.sharpSide}`}
                    price={s.signal.replace(/_/g, " ")}
                    changeLabel={s.confidence}
                    change={s.confidence === "high" ? 1 : 0}
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
