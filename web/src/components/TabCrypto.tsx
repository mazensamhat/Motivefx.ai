import { useEffect, useState } from "react";
import { Bitcoin, TrendingUp } from "lucide-react";
import { useApi } from "../hooks/useApi";
import { useAutoAnalyze } from "../hooks/useAutoAnalyze";
import { useModules } from "../hooks/useModules";
import { FeatureGate } from "./FeatureGate";
import type { PredictionMarket, WhaleAlert } from "../types";
import { AiAdvisor } from "./AiAdvisor";
import { DeepScanModal } from "./DeepScanModal";
import { ModuleIntelStrip } from "./ModuleIntelStrip";
import { PortfolioOverview } from "./PortfolioOverview";
import { calcWinRate } from "../utils/winRate";
import { PortfolioPanel } from "./PortfolioPanel";
import { NewsPanel } from "./NewsPanel";
import { CryptoActivityPanel } from "./CryptoActivityPanel";
import { VirtualizedScoopList } from "./VirtualizedScoopList";
import { ClickableDataRow } from "./ClickableDataRow";
import { useSignalDetail } from "../hooks/useSignalDetail";
import { eventMarketDetail, whaleAlertDetail } from "../utils/signalIntel";

function formatUsd(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}

export function TabCrypto() {
  const { inspectDetail } = useSignalDetail();
  const { hasModule, hasFeature, loading: modulesLoading } = useModules();
  const enabled = !modulesLoading && hasModule("crypto");
  const whales = useApi<{ items: WhaleAlert[] }>("/crypto/whale-alerts");
  const markets = useApi<{ items: PredictionMarket[] }>("/crypto/prediction-odds");
  const { result, loading, analyzeError, deepScan, analyze, applyResult, dismissScan } = useAutoAnalyze("crypto", enabled);
  const [holdingsCount, setHoldingsCount] = useState(0);

  useEffect(() => {
    if (enabled && holdingsCount > 0 && !result && !loading && !analyzeError) {
      analyze(false);
    }
  }, [enabled, holdingsCount, result, loading, analyzeError, analyze]);

  return (
    <>
      <DeepScanModal scan={deepScan} onDismiss={dismissScan} />
      <ModuleIntelStrip tab="crypto" />
      <FeatureGate feature="portfolio_intelligence">
        <PortfolioOverview
          label="CRYPTO HOLDINGS"
          value={result?.portfolio_value}
          subtitle="Demo · BTC, ETH, SOL"
          winRate={calcWinRate(result?.recommendations)}
          module="crypto"
        />
        <div className="grid-2" style={{ marginBottom: "1rem" }}>
          <PortfolioPanel
            module="crypto"
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
            <h2 className="card-title">
              <Bitcoin size={18} /> Whale Alerts
            </h2>
          </div>
          <div className="card-body flush">
            {whales.loading ? (
              <div className="loading">Loading whale alerts…</div>
            ) : (whales.data?.items.length ?? 0) === 0 ? (
              <div className="empty">No whale alerts.</div>
            ) : (
              <VirtualizedScoopList
                items={whales.data?.items ?? []}
                estimateRowHeight={72}
                maxHeight="min(22rem, 50vh)"
                measureDynamic
                renderItem={(w) => (
                  <ClickableDataRow
                    onInspect={() => inspectDetail(whaleAlertDetail(w))}
                    title={`Whale alert: ${w.asset}`}
                  >
                    <div>
                      <div className="row-primary">{w.asset} · {formatUsd(w.amountUsd)}</div>
                      {w.note && <div className="row-secondary">{w.note}</div>}
                    </div>
                    <div className="row-meta">
                      <span className={`badge ${w.direction === "deposit" ? "badge-bearish" : "badge-bullish"}`}>
                        {w.direction}
                      </span>
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
              <TrendingUp size={18} /> Polymarket Odds
            </h2>
          </div>
          <div className="card-body flush">
            {markets.loading ? (
              <div className="loading">Loading markets…</div>
            ) : (markets.data?.items.length ?? 0) === 0 ? (
              <div className="empty">No markets loaded.</div>
            ) : (
              <VirtualizedScoopList
                items={markets.data?.items ?? []}
                estimateRowHeight={68}
                maxHeight="min(22rem, 50vh)"
                renderItem={(m) => (
                  <ClickableDataRow
                    onInspect={() => inspectDetail(eventMarketDetail(m))}
                    title={`Event market: ${m.market}`}
                  >
                    <div>
                      <div className="row-primary">{m.market}</div>
                      <div className="row-secondary">24h vol {m.volume24h}</div>
                    </div>
                    <div className="row-meta">{(m.yes * 100).toFixed(0)}% yes</div>
                  </ClickableDataRow>
                )}
              />
            )}
          </div>
        </div>
      </div>
      <NewsPanel module="crypto" />
      <CryptoActivityPanel />
    </>
  );
}
