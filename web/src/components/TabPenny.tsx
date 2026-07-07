import { useEffect, useState } from "react";
import { TrendingUp, Zap } from "lucide-react";
import { useApi } from "../hooks/useApi";
import { useAutoAnalyze } from "../hooks/useAutoAnalyze";
import { useModules } from "../hooks/useModules";
import { FeatureGate } from "./FeatureGate";
import type { PennyMover } from "../types";
import { AiAdvisor } from "./AiAdvisor";
import { DeepScanModal } from "./DeepScanModal";
import { ModuleIntelStrip } from "./ModuleIntelStrip";
import { PortfolioOverview } from "./PortfolioOverview";
import { calcWinRate } from "../utils/winRate";
import { PortfolioPanel } from "./PortfolioPanel";
import { PennyActivityPanel } from "./PennyActivityPanel";
import { NewsPanel } from "./NewsPanel";
import { VirtualizedScoopList } from "./VirtualizedScoopList";
import { ClickableDataRow } from "./ClickableDataRow";
import { useSignalDetail } from "../hooks/useSignalDetail";
import { moverToSignalDetail } from "../utils/signalIntel";

export function TabPenny() {
  const { inspectDetail } = useSignalDetail();
  const { hasModule, hasFeature, loading: modulesLoading } = useModules();
  const enabled = !modulesLoading && hasModule("penny");
  const movers = useApi<{ items: PennyMover[] }>(enabled ? "/penny/movers" : "", 30_000);
  const spikes = useApi<{ items: PennyMover[] }>(enabled ? "/penny/volume-spikes" : "", 30_000);
  const { result, loading, analyzeError, deepScan, analyze, applyResult, dismissScan } = useAutoAnalyze("penny", enabled);
  const [holdingsCount, setHoldingsCount] = useState(0);

  useEffect(() => {
    if (enabled && holdingsCount > 0 && !result && !loading && !analyzeError) {
      analyze(false);
    }
  }, [enabled, holdingsCount, result, loading, analyzeError, analyze]);

  return (
    <>
      <DeepScanModal scan={deepScan} onDismiss={dismissScan} />
      <ModuleIntelStrip tab="penny" />
      <FeatureGate feature="portfolio_intelligence">
        <PortfolioOverview
          label="PINK SLIP HOLDINGS"
          value={result?.portfolio_value}
          subtitle="Demo · SNDL, AMC, OPEN, BNGO"
          winRate={calcWinRate(result?.recommendations)}
          module="pinkslips"
        />
        <div className="grid-2" style={{ marginBottom: "1rem" }}>
          <PortfolioPanel
            module="penny"
            analyzing={loading}
            setAnalyzing={() => {}}
            onHoldingsChange={setHoldingsCount}
            onAnalyzed={(d) => applyResult(d, true)}
          />
          <AiAdvisor
            summary={result?.summary}
            aiNarrative={result?.ai_narrative}
            recommendations={result?.recommendations ?? []}
            loading={loading}
            holdingsCount={holdingsCount}
            analyzeError={analyzeError}
            onAnalyze={() => analyze(false)}
          />
        </div>
      </FeatureGate>
      {!hasFeature("portfolio_intelligence") && (
        <div className="grid-2" style={{ marginBottom: "1rem" }}>
          <AiAdvisor
            summary={result?.summary}
            aiNarrative={result?.ai_narrative}
            recommendations={result?.recommendations ?? []}
            loading={loading}
            holdingsCount={0}
            analyzeError={analyzeError}
            onAnalyze={() => analyze(false)}
          />
        </div>
      )}
      <div className="grid-2">
        <div className="card">
          <div className="card-header">
            <h2 className="card-title"><Zap size={18} /> Penny Movers</h2>
          </div>
          <div className="card-body flush">
            {movers.loading ? (
              <div className="loading">Scanning sub-$5 movers…</div>
            ) : (movers.data?.items.length ?? 0) === 0 ? (
              <div className="empty">No movers right now.</div>
            ) : (
              <VirtualizedScoopList
                items={movers.data?.items ?? []}
                estimateRowHeight={80}
                maxHeight="min(22rem, 50vh)"
                measureDynamic
                renderItem={(m) => (
                  <ClickableDataRow
                    onInspect={() => inspectDetail(moverToSignalDetail(m))}
                    title={`Volume intel: $${m.symbol}`}
                  >
                    <div>
                      <div className="row-primary">
                        ${m.symbol}{" "}
                        <span className={`badge badge-${m.sentiment}`}>
                          {m.changePct >= 0 ? "+" : ""}{m.changePct}%
                        </span>
                      </div>
                      <div className="row-secondary">${m.price?.toFixed(2)} · Vol {m.volRatio}x avg</div>
                      {m.note && <div className="row-secondary">{m.note}</div>}
                    </div>
                    <div className="row-meta">{m.volume?.toLocaleString()}</div>
                  </ClickableDataRow>
                )}
              />
            )}
          </div>
        </div>
        <div className="card">
          <div className="card-header">
            <h2 className="card-title"><TrendingUp size={18} /> Volume Spikes</h2>
          </div>
          <div className="card-body flush">
            {spikes.loading ? (
              <div className="loading">Scanning volume spikes…</div>
            ) : (spikes.data?.items.length ?? 0) === 0 ? (
              <div className="empty">No volume spikes.</div>
            ) : (
              <VirtualizedScoopList
                items={spikes.data?.items ?? []}
                estimateRowHeight={68}
                maxHeight="min(22rem, 50vh)"
                renderItem={(m) => (
                  <ClickableDataRow
                    onInspect={() => inspectDetail(moverToSignalDetail(m))}
                    title={`Volume spike: $${m.symbol}`}
                  >
                    <div>
                      <div className="row-primary">${m.symbol}</div>
                      <div className="row-secondary">{m.note}</div>
                    </div>
                    <div className="row-meta">{m.volRatio}x</div>
                  </ClickableDataRow>
                )}
              />
            )}
          </div>
        </div>
      </div>
      <NewsPanel module="penny" />
      <PennyActivityPanel />
    </>
  );
}
