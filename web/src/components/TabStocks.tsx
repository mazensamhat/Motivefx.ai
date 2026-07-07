import { useEffect, useState } from "react";
import { Activity, Landmark } from "lucide-react";
import { useApi } from "../hooks/useApi";
import { useAutoAnalyze } from "../hooks/useAutoAnalyze";
import { useModules } from "../hooks/useModules";
import { FeatureGate } from "./FeatureGate";
import type { CongressTrade, UnusualOption } from "../types";
import { AiAdvisor } from "./AiAdvisor";
import { DeepScanModal } from "./DeepScanModal";
import { ModuleIntelStrip } from "./ModuleIntelStrip";
import { PortfolioOverview } from "./PortfolioOverview";
import { calcWinRate } from "../utils/winRate";
import { PortfolioPanel } from "./PortfolioPanel";
import { NewsPanel } from "./NewsPanel";
import { VirtualizedScoopList } from "./VirtualizedScoopList";
import { StockActivityPanel } from "./StockActivityPanel";
import { ClickableDataRow } from "./ClickableDataRow";
import { useSignalDetail } from "../hooks/useSignalDetail";
import { congressFlowDetail, optionFlowDetail } from "../utils/signalIntel";

export function TabStocks() {
  const { inspectDetail } = useSignalDetail();
  const { hasModule, hasFeature, loading: modulesLoading } = useModules();
  const enabled = !modulesLoading && hasModule("trades");
  const options = useApi<{ items: UnusualOption[] }>(
    enabled ? "/stocks/unusual-options" : "",
    30_000
  );
  const congress = useApi<{ items: CongressTrade[] }>(
    enabled ? "/stocks/congress-trades" : "",
    30_000
  );
  const { result, loading, analyzeError, deepScan, analyze, applyResult, dismissScan } = useAutoAnalyze("trades", enabled);
  const [holdingsCount, setHoldingsCount] = useState(0);

  useEffect(() => {
    if (enabled && holdingsCount > 0 && !result && !loading && !analyzeError) {
      analyze(false);
    }
  }, [enabled, holdingsCount, result, loading, analyzeError, analyze]);

  return (
    <>
      <DeepScanModal scan={deepScan} onDismiss={dismissScan} />
      <ModuleIntelStrip tab="stocks" />
      <FeatureGate feature="portfolio_intelligence">
        <PortfolioOverview
          label="HOLDINGS OVERVIEW"
          value={result?.portfolio_value}
          subtitle="Demo holdings · NVDA, AAPL, TSLA, MSFT"
          winRate={calcWinRate(result?.recommendations)}
          module="trades"
        />
        <div className="grid-2" style={{ marginBottom: "1rem" }}>
          <PortfolioPanel
            module="trades"
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
              <Activity size={18} /> Unusual Options (yfinance)
            </h2>
          </div>
          <div className="card-body flush">
            {options.loading ? (
              <div className="loading">Scanning options flow…</div>
            ) : (options.data?.items.length ?? 0) === 0 ? (
              <div className="empty">No unusual options right now.</div>
            ) : (
              <VirtualizedScoopList
                items={options.data?.items ?? []}
                estimateRowHeight={76}
                maxHeight="min(22rem, 50vh)"
                renderItem={(o) => (
                  <ClickableDataRow
                    onInspect={() => inspectDetail(optionFlowDetail(o))}
                    title={`Options flow: $${o.symbol}`}
                  >
                    <div>
                      <div className="row-primary">
                        ${o.symbol}{" "}
                        <span className={`badge badge-${o.sentiment}`}>{o.type.toUpperCase()}</span>
                      </div>
                      <div className="row-secondary">
                        Strike ${o.strike} · Vol {o.volume?.toLocaleString()}
                      </div>
                      {o.note && <div className="row-secondary">{o.note}</div>}
                    </div>
                    <div className="row-meta">${(o.premium ?? 0).toLocaleString()}</div>
                  </ClickableDataRow>
                )}
              />
            )}
          </div>
        </div>
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">
              <Landmark size={18} /> Congress Disclosures
            </h2>
          </div>
          <div className="card-body flush">
            {congress.loading ? (
              <div className="loading">Loading disclosures…</div>
            ) : (congress.data?.items.length ?? 0) === 0 ? (
              <div className="empty">No recent disclosures.</div>
            ) : (
              <VirtualizedScoopList
                items={congress.data?.items ?? []}
                estimateRowHeight={68}
                maxHeight="min(22rem, 50vh)"
                renderItem={(t) => (
                  <ClickableDataRow
                    onInspect={() => inspectDetail(congressFlowDetail(t))}
                    title={`Congress flow: ${t.symbol}`}
                  >
                    <div>
                      <div className="row-primary">{t.politician}</div>
                      <div className="row-secondary">
                        {t.transaction} ${t.symbol} · {t.amount}
                      </div>
                    </div>
                    <div className="row-meta">{t.filedAt}</div>
                  </ClickableDataRow>
                )}
              />
            )}
          </div>
        </div>
      </div>
      <NewsPanel module="trades" />
      <StockActivityPanel />
    </>
  );
}
