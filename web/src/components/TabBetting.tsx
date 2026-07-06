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
import { ClickableDataRow } from "./ClickableDataRow";
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

  return (
    <>
      <DeepScanModal scan={deepScan} onDismiss={dismissScan} />
      <ModuleIntelStrip tab="betting" />
      {simMode && <SimulationBanner module="betting" />}
      <PortfolioOverview
        label="ACTIVE BETS"
        value={simMode ? simulation?.bankroll : result?.portfolio_value}
        subtitle={simMode ? "Simulation · virtual bankroll" : "Demo slip · 4 open wagers"}
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
                estimateRowHeight={68}
                maxHeight="min(22rem, 50vh)"
                renderItem={(l) => (
                  <ClickableDataRow
                    onInspect={() => inspectDetail(lineMoveDetail(l))}
                    title={`Line move: ${l.matchup}`}
                  >
                    <div>
                      <div className="row-primary">{l.matchup}</div>
                      <div className="row-secondary">{l.sport} · {l.book}</div>
                    </div>
                    <div className="row-meta">
                      {l.openingLine} → {l.currentLine}
                    </div>
                  </ClickableDataRow>
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
                estimateRowHeight={68}
                maxHeight="min(22rem, 50vh)"
                renderItem={(s) => (
                  <ClickableDataRow
                    onInspect={() => inspectDetail(sharpMoneyDetail(s))}
                    title={`Sharp money: ${s.matchup}`}
                  >
                    <div>
                      <div className="row-primary">{s.matchup}</div>
                      <div className="row-secondary">Sharp: {s.sharpSide}</div>
                    </div>
                    <div className="row-meta">
                      <span className={`badge badge-${s.confidence}`}>{s.signal.replace(/_/g, " ")}</span>
                    </div>
                  </ClickableDataRow>
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
