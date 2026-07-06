import { useEffect } from "react";
import { Globe, TrendingUp } from "lucide-react";
import { useApi } from "../hooks/useApi";
import { useAutoAnalyze } from "../hooks/useAutoAnalyze";
import { useModules } from "../hooks/useModules";
import type { PredictionMarket } from "../types";
import { AiAdvisor } from "./AiAdvisor";
import { DeepScanModal } from "./DeepScanModal";
import { ModuleIntelStrip } from "./ModuleIntelStrip";
import { PortfolioOverview } from "./PortfolioOverview";
import { calcWinRate } from "../utils/winRate";
import { PredictionActivityPanel } from "./PredictionActivityPanel";
import { NewsPanel } from "./NewsPanel";
import { PredictionTracker } from "./PredictionTracker";
import { SimulationBanner } from "./SimulationBanner";
import { VirtualizedScoopList } from "./VirtualizedScoopList";
import { ClickableDataRow } from "./ClickableDataRow";
import { useSignalDetail } from "../hooks/useSignalDetail";
import { eventMarketDetail } from "../utils/signalIntel";

export function TabPredictions() {
  const { inspectDetail } = useSignalDetail();
  const { hasModule, isSimulationOnly, simulation, loading: modulesLoading } = useModules();
  const enabled = !modulesLoading && hasModule("predictions");
  const simMode = isSimulationOnly("predictions");
  const markets = useApi<{ items: PredictionMarket[] }>("/predictions/markets?limit=10");
  const { result, loading, deepScan, analyze, applyResult, dismissScan } = useAutoAnalyze("predictions", enabled);

  useEffect(() => {
    if (enabled) analyze(true);
  }, [enabled, analyze]);

  return (
    <>
      <DeepScanModal scan={deepScan} onDismiss={dismissScan} />
      <ModuleIntelStrip tab="predictions" />
      {simMode && <SimulationBanner module="predictions" />}
      <PortfolioOverview
        label="PREDICTION POSITIONS"
        value={simMode ? simulation?.bankroll : result?.portfolio_value}
        subtitle={simMode ? "Simulation · virtual bankroll" : "Demo · war, celebrity & Fed markets"}
        winRate={calcWinRate(result?.recommendations)}
        module="predictions"
      />
      <div className="grid-2" style={{ marginBottom: "1rem" }}>
        <PredictionTracker
          analyzing={loading}
          setAnalyzing={() => {}}
          onAnalyzed={(d) => applyResult(d, true)}
          simulationMode={simMode}
        />
        <AiAdvisor
          summary={result?.summary}
          aiNarrative={result?.ai_narrative}
          recommendations={result?.recommendations ?? []}
          loading={loading}
          ratingContext="predictions"
        />
      </div>
      <div className="card" style={{ marginBottom: "1rem" }}>
        <div className="card-header">
          <h2 className="card-title"><Globe size={18} /> Live Event Markets</h2>
        </div>
        <div className="card-body flush">
          {markets.loading ? (
            <div className="loading">Loading event markets…</div>
          ) : (markets.data?.items.length ?? 0) === 0 ? (
            <div className="empty">No markets loaded.</div>
          ) : (
            <VirtualizedScoopList
              items={markets.data?.items ?? []}
              estimateRowHeight={68}
              maxHeight="min(24rem, 52vh)"
              renderItem={(m) => (
                <ClickableDataRow
                  onInspect={() => inspectDetail(eventMarketDetail(m))}
                  title={`Event market: ${m.market}`}
                >
                  <div>
                    <div className="row-primary">{m.market}</div>
                    <div className="row-secondary">
                      {m.categoryLabel ?? m.platform} · 24h {m.volume24h}
                    </div>
                  </div>
                  <div className="row-meta">
                    <TrendingUp size={14} style={{ marginRight: 4, verticalAlign: -2 }} />
                    {(m.yes * 100).toFixed(0)}% yes
                  </div>
                </ClickableDataRow>
              )}
            />
          )}
        </div>
      </div>
      <NewsPanel module="predictions" />
      <PredictionActivityPanel />
    </>
  );
}
