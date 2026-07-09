import { useEffect, useState } from "react";
import { Bitcoin } from "lucide-react";
import { useApi } from "../hooks/useApi";
import { useAutoAnalyze } from "../hooks/useAutoAnalyze";
import { useModules } from "../hooks/useModules";
import { FeatureGate } from "./FeatureGate";
import type { WhaleAlert } from "../types";
import { AiAdvisor } from "./AiAdvisor";
import { DeepScanModal } from "./DeepScanModal";
import { ModuleIntelStrip } from "./ModuleIntelStrip";
import { PortfolioOverview } from "./PortfolioOverview";
import { calcWinRate } from "../utils/winRate";
import { PortfolioPanel } from "./PortfolioPanel";
import { NewsPanel } from "./NewsPanel";
import { CryptoActivityPanel } from "./CryptoActivityPanel";
import { VirtualizedScoopList } from "./VirtualizedScoopList";
import { ModuleItemCard } from "./ModuleItemCard";
import { useSignalDetail } from "../hooks/useSignalDetail";
import { whaleAlertDetail } from "../utils/signalIntel";

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
          label="CRYPTO PORTFOLIO VALUE"
          value={result?.portfolio_value}
          subtitle="Demo · BTC, ETH, SOL · Monitor only"
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
      <div className="card" style={{ marginBottom: "1rem" }}>
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
              estimateRowHeight={96}
              maxHeight="min(22rem, 50vh)"
              measureDynamic
              renderItem={(w) => (
                <ModuleItemCard
                  onClick={() => inspectDetail(whaleAlertDetail(w))}
                  title={`Whale alert: ${w.asset}`}
                  symbol={w.asset}
                  name={w.note || `${w.direction} flow`}
                  price={formatUsd(w.amountUsd)}
                  changeLabel={w.direction}
                  change={w.direction === "deposit" ? -1 : 1}
                />
              )}
            />
          )}
        </div>
      </div>
      <NewsPanel module="crypto" />
      <CryptoActivityPanel />
    </>
  );
}
