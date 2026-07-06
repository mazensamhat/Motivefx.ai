import { useState } from "react";
import {
  BarChart3,
  Coins,
  ExternalLink,
  Home,
  Sparkles,
  Trophy,
  TrendingUp,
  Wand2,
  X,
} from "lucide-react";
import type { BrandModuleId } from "../brand/moduleBrand";
import { MODULE_BRAND } from "../brand/moduleBrand";
import { useApi } from "../hooks/useApi";
import { usePlatformPrefs } from "../hooks/usePlatformPrefs";
import type { AssetDeepDivePayload } from "../utils/assetDeepDive";
import type { HomeBriefing } from "../types";
import { NeonAreaChart } from "./NeonAreaChart";
import { SlideToConfirm } from "./SlideToConfirm";

const MODULE_ICONS: Record<BrandModuleId, typeof BarChart3> = {
  home: Home,
  trades: BarChart3,
  pinkslips: TrendingUp,
  crypto: Coins,
  betting: Trophy,
  predictions: Sparkles,
};

interface Props {
  payload: AssetDeepDivePayload | null;
  module: BrandModuleId;
  onClose: () => void;
}

export function AssetDeepDiveModal({ payload, module, onClose }: Props) {
  const [stake, setStake] = useState(500);
  const [pendingSide, setPendingSide] = useState<"BUY" | "SELL" | null>(null);
  const [redirecting, setRedirecting] = useState(false);
  const [redirectError, setRedirectError] = useState<string | null>(null);
  const { getPlatformLabel, getPref, openDeeplink, openSetup } = usePlatformPrefs();
  const { data: briefing } = useApi<HomeBriefing>("/home/briefing", 120_000);
  const brand = MODULE_BRAND[module];
  const platformLabel = getPlatformLabel(module);
  const hasPlatform = Boolean(getPref(module)?.platformId);

  if (!payload) return null;

  const sym = payload.linkSymbol?.toUpperCase();
  const relatedSignals =
    sym && briefing?.opportunities
      ? briefing.opportunities.filter(
          (o) => o.symbol.toUpperCase() === sym || o.symbol.toUpperCase().includes(sym)
        )
      : [];

  const Icon = MODULE_ICONS[module];

  function actionLabels(side: "BUY" | "SELL") {
    const app = platformLabel ?? "your app";
    if (module === "predictions") {
      return side === "BUY" ? `Yes on ${app}` : `No on ${app}`;
    }
    if (module === "betting") {
      return side === "BUY" ? `Bet YES · ${app}` : `Bet NO · ${app}`;
    }
    if (module === "crypto") {
      return side === "BUY" ? `Buy on ${app}` : `Sell on ${app}`;
    }
    return side === "BUY" ? `Buy on ${app}` : `Sell on ${app}`;
  }

  async function handleSlideConfirm() {
    if (!pendingSide || !payload) return;
    setRedirectError(null);
    setRedirecting(true);
    try {
      await openDeeplink(
        module,
        pendingSide,
        payload.linkSymbol ?? "",
        payload.linkQuery ?? payload.title
      );
      setPendingSide(null);
      onClose();
    } catch (e) {
      setRedirectError(e instanceof Error ? e.message : "Could not open your app.");
    } finally {
      setRedirecting(false);
    }
  }

  return (
    <div className="asset-dive-overlay" onClick={onClose} role="presentation">
      <div
        className="asset-dive-modal glass-panel"
        style={{
          borderTopColor: brand.accent,
          boxShadow: `0 16px 48px -12px ${brand.glow}`,
        }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal
        aria-labelledby="asset-dive-title"
      >
        <button type="button" className="asset-dive-close" onClick={onClose} aria-label="Close">
          <X size={22} />
        </button>

        <header className="asset-dive-header">
          <div className="asset-dive-header-left">
            <div className="asset-dive-icon" style={{ color: brand.accent }}>
              <Icon size={22} />
            </div>
            <div>
              <h2 id="asset-dive-title" className="asset-dive-title">{payload.title}</h2>
              <div className="asset-dive-meta">
                <span>{payload.moduleLabel}</span>
                <span>·</span>
                <span className="asset-dive-ts">{payload.timestamp}</span>
              </div>
            </div>
          </div>
          <span
            className={`asset-dive-status asset-dive-status-${payload.statusVariant}`}
            style={{ color: brand.accent, borderColor: `${brand.accent}40`, backgroundColor: `${brand.accent}12` }}
          >
            {payload.statusBadge}
          </span>
        </header>

        <div className="asset-dive-body">
          <div className="asset-dive-main">
            <div className="asset-dive-kpi-grid">
              {payload.kpis.map((kpi) => (
                <div key={kpi.label} className="asset-dive-kpi">
                  <span className="asset-dive-kpi-label">{kpi.label}</span>
                  <span
                    className={`asset-dive-kpi-value ${kpi.highlight ? "highlight" : ""}`}
                    style={kpi.highlight ? { color: brand.accent } : undefined}
                  >
                    {kpi.value}
                  </span>
                </div>
              ))}
            </div>

            <div className="asset-dive-chart-panel">
              <div className="asset-dive-chart-header">
                <span>Intraday Trajectory Matrix</span>
                <span className="asset-dive-chart-desc">{payload.chartDesc}</span>
              </div>
              <NeonAreaChart
                points={payload.chartPoints}
                color={brand.accent}
                height={160}
                showGrid
                showNodes
              />
              <div className="asset-dive-chart-footer">
                <span>Opening desk bell</span>
                <span>Current feed update</span>
              </div>
            </div>
          </div>

          <aside className="asset-dive-console">
            <div className="asset-dive-ai-block">
              <div className="asset-dive-ai-label">
                <Wand2 size={12} /> AI Insight Signal
              </div>
              <p className="asset-dive-ai-text">{payload.aiAdvice}</p>
              {relatedSignals.length > 0 && (
                <div className="asset-dive-related">
                  <span className="asset-dive-related-label">Live desk signals</span>
                  <ul>
                    {relatedSignals.slice(0, 3).map((o) => (
                      <li key={o.id}>
                        {o.title} · {o.confidence}% · {o.signals[0]}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="asset-dive-confidence">
                <div className="asset-dive-confidence-row">
                  <span>Signal strength</span>
                  <span style={{ color: brand.accent }}>{payload.confidence}%</span>
                </div>
                <div className="asset-dive-confidence-bar">
                  <div
                    className="asset-dive-confidence-fill"
                    style={{ width: `${payload.confidence}%`, background: `linear-gradient(90deg, ${brand.accent}, var(--green))` }}
                  />
                </div>
              </div>
            </div>

            <div className="asset-dive-sandbox">
              <span className="asset-dive-sandbox-label">Execute via your connected app</span>

              {hasPlatform ? (
                <p className="asset-dive-platform-hint">
                  <ExternalLink size={11} />
                  Opens <strong>{platformLabel}</strong> in a new tab after you slide to confirm.
                </p>
              ) : (
                <div className="asset-dive-platform-missing">
                  <p>No app linked for this module yet.</p>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={openSetup}>
                    Set up my apps
                  </button>
                </div>
              )}

              <div className="asset-dive-stake-row">
                <span>Reference stake size</span>
                <span className="asset-dive-stake-val">${stake.toLocaleString()}</span>
              </div>
              <input
                type="range"
                min={50}
                max={5000}
                step={50}
                value={stake}
                onChange={(e) => setStake(Number(e.target.value))}
                className="asset-dive-stake-slider"
                style={{ accentColor: brand.accent }}
              />

              {hasPlatform && (
                <>
                  <div className="asset-dive-action-btns">
                    <button
                      type="button"
                      className="asset-dive-btn asset-dive-btn-buy"
                      onClick={() => setPendingSide("BUY")}
                      disabled={redirecting}
                    >
                      {actionLabels("BUY")}
                    </button>
                    <button
                      type="button"
                      className="asset-dive-btn asset-dive-btn-sell"
                      onClick={() => setPendingSide("SELL")}
                      disabled={redirecting}
                    >
                      {actionLabels("SELL")}
                    </button>
                  </div>

                  {pendingSide && (
                    <SlideToConfirm
                      label={`Slide to open ${platformLabel} · ${pendingSide}`}
                      accent={pendingSide === "BUY" ? brand.accent : "#ff5252"}
                      onConfirm={handleSlideConfirm}
                      disabled={redirecting}
                    />
                  )}
                </>
              )}

              {redirectError && <p className="platform-setup-error">{redirectError}</p>}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
