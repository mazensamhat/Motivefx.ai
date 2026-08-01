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
import { ModuleItemCard } from "./ModuleItemCard";
import { useAssetDeepDive } from "../hooks/useAssetDeepDive";

export function TabStocks() {
  const { openDeepDive } = useAssetDeepDive();
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
          label="WATCHLIST VALUE"
          value={result?.portfolio_value}
          subtitle="Demo holdings · NVDA, AAPL, TSLA, MSFT · Monitor only"
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
              <Activity size={18} /> Unusual Options Flow
            </h2>
          </div>
          <p className="desk-tap-hint">Tap a ticker for the full scorecard — plain English, health, and what to watch.</p>
          <div className="card-body flush">
            {options.loading ? (
              <div className="loading">Scanning options flow…</div>
            ) : (options.data?.items.length ?? 0) === 0 ? (
              <div className="empty">No unusual options right now.</div>
            ) : (
              <VirtualizedScoopList
                items={options.data?.items ?? []}
                estimateRowHeight={96}
                maxHeight="min(22rem, 50vh)"
                renderItem={(o) => (
                  <ModuleItemCard
                    onClick={() =>
                      openDeepDive(
                        {
                          symbol: o.symbol,
                          type: o.type,
                          side: o.type === "put" ? "sell" : "buy",
                          premium: o.premium,
                          note:
                            o.note ??
                            `Strike $${o.strike} · Vol ${o.volume?.toLocaleString() ?? "—"}${
                              o.openInterest ? ` · OI ${o.openInterest.toLocaleString()}` : ""
                            }`,
                          volOiRatio:
                            o.volume && o.openInterest
                              ? Number((o.volume / Math.max(1, o.openInterest)).toFixed(1))
                              : undefined,
                          timestamp: new Date().toISOString(),
                          id: `opt-${o.symbol}-${o.type}-${o.strike ?? ""}`,
                        },
                        "trades"
                      )
                    }
                    title={`Options flow: $${o.symbol}`}
                    symbol={
                      <>
                        ${o.symbol}{" "}
                        <span className={`badge badge-${o.sentiment}`}>{o.type.toUpperCase()}</span>
                      </>
                    }
                    name={`Strike $${o.strike} · Vol ${o.volume?.toLocaleString()}${o.note ? ` · ${o.note}` : ""} · Tap for scorecard`}
                    price={`$${(o.premium ?? 0).toLocaleString()}`}
                    changeLabel={o.sentiment}
                    change={o.sentiment === "bullish" ? 1 : o.sentiment === "bearish" ? -1 : 0}
                  />
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
          <p className="desk-tap-hint">Tap a disclosure to open the ticker scorecard and research checklist.</p>
          <div className="card-body flush">
            {congress.loading ? (
              <div className="loading">Loading disclosures…</div>
            ) : (congress.data?.items.length ?? 0) === 0 ? (
              <div className="empty">No recent disclosures.</div>
            ) : (
              <VirtualizedScoopList
                items={congress.data?.items ?? []}
                estimateRowHeight={88}
                maxHeight="min(22rem, 50vh)"
                renderItem={(t) => (
                  <ModuleItemCard
                    onClick={() =>
                      openDeepDive(
                        {
                          symbol: t.symbol,
                          side: String(t.transaction).toLowerCase().includes("sale") ? "sell" : "buy",
                          actorType: "institutional",
                          note: `${t.politician} · ${t.transaction} · ${t.amount}`,
                          briefingNote: `Congress disclosure on $${t.symbol}: ${t.transaction} ${t.amount}.`,
                          timestamp: t.filedAt ?? new Date().toISOString(),
                          id: `congress-${t.symbol}-${t.politician}`,
                        },
                        "trades"
                      )
                    }
                    title={`Congress flow: ${t.symbol}`}
                    symbol={t.politician}
                    name={`${t.transaction} $${t.symbol} · ${t.amount} · Tap for scorecard`}
                    price={t.filedAt}
                    changeLabel={t.transaction}
                    change={String(t.transaction).toLowerCase().includes("sale") ? -1 : 1}
                  />
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
