import { useEffect, useState } from "react";
import { ExternalLink, X } from "lucide-react";
import { useModules } from "../hooks/useModules";
import {
  APP_MODULE_TO_PLATFORM,
  PLATFORM_MODULE_KEYS,
  type PlatformCatalogResponse,
  type PlatformModuleKey,
  type PlatformPref,
} from "../config/tradingPlatforms";
import { MODULE_BRAND, type BrandModuleId } from "../brand/moduleBrand";

const PLATFORM_TO_BRAND: Record<PlatformModuleKey, BrandModuleId> = {
  trades: "trades",
  penny: "pinkslips",
  crypto: "crypto",
  betting: "betting",
  predictions: "predictions",
};

interface Props {
  catalog: PlatformCatalogResponse;
  prefs: Record<string, PlatformPref>;
  onSave: (prefs: Record<string, PlatformPref>) => Promise<void>;
  onClose: () => void;
}

const CUSTOM_ID = "custom";

export function PlatformSetupModal({ catalog, prefs, onSave, onClose }: Props) {
  const { active, allowedMarkets } = useModules();
  const subscribed =
    allowedMarkets.length > 0
      ? (allowedMarkets.map((m) => APP_MODULE_TO_PLATFORM[m]).filter(Boolean) as PlatformModuleKey[])
      : active.filter((m) => m !== "annual").map((m) => APP_MODULE_TO_PLATFORM[m]).filter(Boolean) as PlatformModuleKey[];

  const modulesToShow = subscribed.length > 0 ? subscribed : PLATFORM_MODULE_KEYS;

  const [draft, setDraft] = useState<Record<string, PlatformPref>>(() => {
    const init: Record<string, PlatformPref> = {};
    for (const key of modulesToShow) {
      init[key] = prefs[key] ?? { platformId: catalog.platforms[key]?.[0]?.id ?? "" };
    }
    return init;
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const init: Record<string, PlatformPref> = {};
    for (const key of modulesToShow) {
      init[key] = prefs[key] ?? { platformId: catalog.platforms[key]?.[0]?.id ?? "" };
    }
    setDraft(init);
  }, [prefs, catalog, modulesToShow.join(",")]);

  async function handleSave() {
    setError(null);
    for (const key of modulesToShow) {
      const entry = draft[key];
      if (!entry?.platformId) {
        setError(`Pick an app for ${catalog.modules[key]}.`);
        return;
      }
      if (entry.platformId === CUSTOM_ID && !entry.customUrl?.trim()) {
        setError(`Enter a URL for ${catalog.modules[key]}.`);
        return;
      }
    }
    setSaving(true);
    try {
      await onSave(draft);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save preferences.");
    } finally {
      setSaving(false);
    }
  }

  function handleSkip() {
    sessionStorage.setItem("motivefx_platform_setup_dismissed", "1");
    onClose();
  }

  return (
    <div className="platform-setup-overlay" onClick={onClose} role="presentation">
      <div
        className="platform-setup-modal glass-panel"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal
        aria-labelledby="platform-setup-title"
      >
        <button type="button" className="asset-dive-close" onClick={onClose} aria-label="Close">
          <X size={22} />
        </button>

        <header className="platform-setup-header">
          <h2 id="platform-setup-title" className="platform-setup-title">
            Connect your apps & brokers
          </h2>
          <p className="platform-setup-sub">
            Tell us where you trade, bet, and buy predictions. When you confirm a buy or sell in
            MotiveFX.AI, we&apos;ll send you straight to the right app or website.
          </p>
        </header>

        <div className="platform-setup-grid">
          {modulesToShow.map((key) => {
            const accent = MODULE_BRAND[PLATFORM_TO_BRAND[key]].accent;
            const entry = draft[key] ?? { platformId: "" };
            const options = catalog.platforms[key] ?? [];

            return (
              <label key={key} className="platform-setup-row" style={{ ["--row-accent" as string]: accent }}>
                <span className="platform-setup-module">{catalog.modules[key]}</span>
                <select
                  value={entry.platformId}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      [key]: { platformId: e.target.value, customUrl: d[key]?.customUrl },
                    }))
                  }
                >
                  <option value="">Select app…</option>
                  {options.map((o) => (
                    <option key={o.id} value={o.id}>{o.name}</option>
                  ))}
                  <option value={CUSTOM_ID}>Other (custom URL)</option>
                </select>
                {entry.platformId === CUSTOM_ID && (
                  <input
                    type="url"
                    placeholder="https://your-broker-or-app.com"
                    value={entry.customUrl ?? ""}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        [key]: { platformId: CUSTOM_ID, customUrl: e.target.value },
                      }))
                    }
                  />
                )}
              </label>
            );
          })}
        </div>

        {error && <p className="platform-setup-error">{error}</p>}

        <div className="platform-setup-actions">
          <button type="button" className="btn btn-ghost btn-sm" onClick={handleSkip}>
            Skip for now
          </button>
          <button type="button" className="btn btn-accent-terminal btn-sm" onClick={handleSave} disabled={saving}>
            <ExternalLink size={12} />
            {saving ? "Saving…" : "Save & continue"}
          </button>
        </div>
      </div>
    </div>
  );
}
