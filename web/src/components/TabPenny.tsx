import { useEffect, useState } from "react";
import { TrendingUp, Zap, Check, Plus } from "lucide-react";
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
import { ModuleItemCard, ModuleSummaryCard } from "./ModuleItemCard";
import { useAssetDeepDive } from "../hooks/useAssetDeepDive";
import { apiGet, apiPost, getUserId } from "../lib/api";
import { useAuth } from "../hooks/useAuth";

export function TabPenny() {
  const { openDeepDive } = useAssetDeepDive();
  const { isAuthenticated, user, openAuth } = useAuth();
  const [savingSymbol, setSavingSymbol] = useState<string | null>(null);
  const [savedSymbols, setSavedSymbols] = useState<Set<string>>(new Set());
  const [portfolioActionError, setPortfolioActionError] = useState<string | null>(null);
  const { hasModule, hasFeature, loading: modulesLoading } = useModules();
  const enabled = !modulesLoading && hasModule("penny");
  const movers = useApi<{ items: PennyMover[] }>(enabled ? "/penny/movers" : "", 30_000);
  const spikes = useApi<{ items: PennyMover[] }>(enabled ? "/penny/volume-spikes" : "", 30_000);
  const { result, loading, analyzeError, deepScan, analyze, applyResult, dismissScan } = useAutoAnalyze("penny", enabled);
  const [holdingsCount, setHoldingsCount] = useState(0);

  async function addSymbol(symbol: string) {
    if (!isAuthenticated) { openAuth("login"); return; }
    const key = symbol.toUpperCase();
    setSavingSymbol(key);
    setPortfolioActionError(null);
    try {
      const res = await apiPost<{ count: number }>("/terminal/portfolio/add", { user_id: user?.userId ?? getUserId(), kind: "penny", symbol: key });
      setSavedSymbols((prev) => new Set(prev).add(key));
      setHoldingsCount(res.count);
      window.dispatchEvent(new Event("motivefx:briefing-refresh"));
      window.dispatchEvent(new CustomEvent("motivefx:portfolio-changed", { detail: { kind: "penny" } }));
    } catch (e) {
      setPortfolioActionError(e instanceof Error ? e.message : "Could not add to portfolio");
    } finally {
      setSavingSymbol(null);
    }
  }

  useEffect(() => {
    if (!isAuthenticated) { setSavedSymbols(new Set()); return; }
    const userId = user?.userId ?? getUserId();
    apiGet<{ holdings: Array<{ symbol: string }> }>(`/advisor/penny/portfolio/${userId}`)
      .then((d) => setSavedSymbols(new Set((d.holdings ?? []).map((h) => h.symbol.toUpperCase()))))
      .catch(() => setSavedSymbols(new Set()));
  }, [isAuthenticated, user?.userId]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const reloadAddedState = () => {
      const userId = user?.userId ?? getUserId();
      apiGet<{ holdings: Array<{ symbol: string }> }>(`/advisor/penny/portfolio/${userId}`)
        .then((d) => setSavedSymbols(new Set((d.holdings ?? []).map((h) => h.symbol.toUpperCase()))))
        .catch(() => {});
    };
    const onPortfolioChanged = (event: Event) => {
      if ((event as CustomEvent<{ kind?: string }>).detail?.kind === "penny") reloadAddedState();
    };
    window.addEventListener("motivefx:portfolio-changed", onPortfolioChanged);
    return () => window.removeEventListener("motivefx:portfolio-changed", onPortfolioChanged);
  }, [isAuthenticated, user?.userId]);

  useEffect(() => {
    if (enabled && holdingsCount > 0 && !result && !loading && !analyzeError) {
      analyze(false);
    }
  }, [enabled, holdingsCount, result, loading, analyzeError, analyze]);

  const inventory = result?.portfolio_value;
  const potential =
    inventory != null ? Math.round(inventory * 0.16 * 100) / 100 : null;

  return (
    <>
      <DeepScanModal scan={deepScan} onDismiss={dismissScan} />
      {portfolioActionError ? <div className="error">{portfolioActionError}</div> : null}
      <ModuleIntelStrip tab="penny" />
      <FeatureGate feature="portfolio_intelligence">
        {inventory != null ? (
          <div className="mf-dual-stats">
            <ModuleSummaryCard
              label="Inventory Value"
              value={`$${inventory.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
              subtitle="Demo garage · Monitor only"
            />
            <ModuleSummaryCard
              label="Potential Profit"
              value={potential != null ? `$${potential.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "—"}
              delta={16}
              deltaLabel="Est. upside*"
              subtitle="Informational scenario only"
            />
          </div>
        ) : (
          <PortfolioOverview
            label="PINK SLIP HOLDINGS"
            value={result?.portfolio_value}
            subtitle="Demo · SNDL, AMC, OPEN, BNGO · Monitor only"
            winRate={calcWinRate(result?.recommendations)}
            module="pinkslips"
          />
        )}
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
            <h2 className="card-title"><Zap size={18} /> Garage Movers</h2>
          </div>
          <div className="card-body flush">
            {movers.loading ? (
              <div className="loading">Scanning sub-$5 movers…</div>
            ) : (movers.data?.items.length ?? 0) === 0 ? (
              <div className="empty">No movers right now.</div>
            ) : (
              <VirtualizedScoopList
                items={movers.data?.items ?? []}
                estimateRowHeight={100}
                maxHeight="min(22rem, 50vh)"
                measureDynamic
                renderItem={(m) => (
                  <ModuleItemCard
                    onClick={() =>
                      openDeepDive(
                        {
                          symbol: m.symbol,
                          price: m.price,
                          changePct: m.changePct,
                          volRatio: m.volRatio,
                          note: m.note,
                          side: (m.changePct ?? 0) >= 0 ? "buy" : "sell",
                          timestamp: new Date().toISOString(),
                          id: `penny-${m.symbol}`,
                        },
                        "pinkslips"
                      )
                    }
                    title={`Volume intel: $${m.symbol}`}
                    symbol={`$${m.symbol}`}
                    name={`$${m.price?.toFixed(2)} · Vol ${m.volRatio}x avg${m.note ? ` · ${m.note}` : ""} · Tap for scorecard`}
                    price={m.volume?.toLocaleString()}
                    change={m.changePct}
                    actions={<button type="button" className="btn btn-sm btn-ghost" disabled={savingSymbol === m.symbol.toUpperCase() || savedSymbols.has(m.symbol.toUpperCase())} onClick={() => void addSymbol(m.symbol)}>{savedSymbols.has(m.symbol.toUpperCase()) ? <><Check size={12} /> Added</> : <><Plus size={12} /> Add</>}</button>}
                  />
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
                estimateRowHeight={88}
                maxHeight="min(22rem, 50vh)"
                renderItem={(m) => (
                  <ModuleItemCard
                    onClick={() =>
                      openDeepDive(
                        {
                          symbol: m.symbol,
                          price: m.price,
                          changePct: m.changePct,
                          volRatio: m.volRatio,
                          note: m.note,
                          side: (m.changePct ?? 0) >= 0 ? "buy" : "sell",
                          timestamp: new Date().toISOString(),
                          id: `spike-${m.symbol}`,
                        },
                        "pinkslips"
                      )
                    }
                    title={`Volume spike: $${m.symbol}`}
                    symbol={`$${m.symbol}`}
                    name={`${m.note ?? "Volume spike"} · Tap for scorecard`}
                    price={`${m.volRatio}x`}
                    change={m.changePct}
                    actions={<button type="button" className="btn btn-sm btn-ghost" disabled={savingSymbol === m.symbol.toUpperCase() || savedSymbols.has(m.symbol.toUpperCase())} onClick={() => void addSymbol(m.symbol)}>{savedSymbols.has(m.symbol.toUpperCase()) ? <><Check size={12} /> Added</> : <><Plus size={12} /> Add</>}</button>}
                  />
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
