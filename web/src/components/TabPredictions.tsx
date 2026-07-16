import { useEffect } from "react";
import { Globe } from "lucide-react";
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
import { ModuleItemCard } from "./ModuleItemCard";
import { useSignalDetail } from "../hooks/useSignalDetail";
import { eventMarketDetail } from "../utils/signalIntel";

export function TabPredictions() {
  const { inspectDetail } = useSignalDetail();
  const { hasModule, isSimulationOnly, simulation, loading: modulesLoading } = useModules();
  const enabled = !modulesLoading && hasModule("predictions");
  const simMode = isSimulationOnly("predictions");
  const markets = useApi<{
    items: PredictionMarket[];
    source?: "live" | "demo";
    updatedAt?: string;
    error?: string | null;
    bitquery?: { enabled?: boolean; count?: number; error?: string | null };
  }>("/predictions/markets?limit=20");
  const { result, loading, deepScan, analyze, applyResult, dismissScan } = useAutoAnalyze("predictions", enabled);

  const marketsUpdated =
    markets.data?.updatedAt != null
      ? new Date(markets.data.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      : null;

  useEffect(() => {
    if (enabled) analyze(true);
  }, [enabled, analyze]);

  return (
    <>
      <DeepScanModal scan={deepScan} onDismiss={dismissScan} />
      <ModuleIntelStrip tab="predictions" />
      {simMode && <SimulationBanner module="predictions" />}
      <PortfolioOverview
        label="PORTFOLIO VALUE"
        value={simMode ? simulation?.bankroll : result?.portfolio_value}
        subtitle={simMode ? "Simulation · virtual bankroll · Monitor only" : "Demo · war, celebrity & Fed markets · Monitor only"}
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
          <h2 className="card-title"><Globe size={18} /> Trending Markets</h2>
          {marketsUpdated && (
            <span className="card-meta" style={{ fontSize: "0.75rem", opacity: 0.7 }}>
              {markets.data?.source === "live" ? "Polymarket live" : "Sample"}
              {markets.data?.bitquery?.enabled && (markets.data.bitquery.count ?? 0) > 0
                ? ` · Bitquery +${markets.data.bitquery.count}`
                : ""}
              {" "}· {marketsUpdated}
            </span>
          )}
        </div>
        <div className="card-body flush">
          {markets.data?.error && (
            <div className="form-error" style={{ padding: "0.75rem 1rem 0" }}>{markets.data.error}</div>
          )}
          {markets.loading ? (
            <div className="loading">Loading event markets…</div>
          ) : (markets.data?.items.length ?? 0) === 0 ? (
            <div className="empty">No markets loaded.</div>
          ) : (
            <VirtualizedScoopList
              items={markets.data?.items ?? []}
              estimateRowHeight={120}
              maxHeight="min(24rem, 52vh)"
              renderItem={(m) => (
                <ModuleItemCard
                  onClick={() => inspectDetail(eventMarketDetail(m))}
                  title={`Event market: ${m.market}`}
                  symbol={m.market}
                  name={`${m.categoryLabel ?? m.platform} · 24h ${m.volume24h}`}
                  price={`${(m.yes * 100).toFixed(0)}¢ YES`}
                  change={(m.yes - 0.5) * 100}
                  changeLabel={`Vol ${m.volume24h}`}
                >
                  <div className="mf-yesno-row">
                    <span className="mf-yesno yes">YES {(m.yes * 100).toFixed(0)}¢</span>
                    <span className="mf-yesno no">NO {((1 - m.yes) * 100).toFixed(0)}¢</span>
                  </div>
                </ModuleItemCard>
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
