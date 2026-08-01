import { useState } from "react";
import { Bell, GitBranch, Plus, Radar, Sparkles, Zap } from "lucide-react";
import type {
  ConsensusBreak,
  FutureScenarios,
  HomeBriefing,
  ProbabilityView,
} from "../types";
import { apiPost, apiPut } from "../lib/api";
import { SignalGraphRadial } from "./SignalGraphRadial";

interface Props {
  briefing: HomeBriefing;
  onPrefsChanged?: () => void;
  onInspectTheme?: (theme: ProbabilityView) => void;
  onInspectGraphLink?: (link: {
    hubLabel: string;
    satLabel: string;
    relation: string;
    weight: number;
  }) => void;
}

const HORIZONS = ["7 days", "30 days", "30–90 days", "6–12 months"] as const;

export function Phase2IntelPanels({
  briefing,
  onPrefsChanged,
  onInspectTheme,
  onInspectGraphLink,
}: Props) {
  const graph = briefing.signalGraph;
  const themes = briefing.probabilityViews ?? [];
  const breaks = briefing.consensusBreaks ?? [];
  const scenarios = briefing.futureScenarios;
  const [activeNode, setActiveNode] = useState(graph?.activeNodeId ?? "oil");
  const [sim, setSim] = useState<FutureScenarios | null>(scenarios ?? null);
  const [simBusy, setSimBusy] = useState(false);
  const [seed, setSeed] = useState(scenarios?.seedEvent ?? "");
  const [horizon, setHorizon] = useState(scenarios?.horizon ?? "30–90 days");
  const [aggressiveness, setAggressiveness] = useState<"conservative" | "base" | "aggressive">("base");
  const [prefsBusy, setPrefsBusy] = useState(false);

  async function runSimulator() {
    if (!graph) return;
    setSimBusy(true);
    try {
      const res = await apiPost<{ simulation: FutureScenarios }>("/intel/simulate", {
        seedEvent: seed || (themes[0] ? `What if “${themes[0].theme}” accelerates?` : scenarios?.seedEvent),
        horizon,
        nodeId: activeNode,
        symbols: briefing.opportunities.slice(0, 3).map((o) => o.symbol),
        baseProbability: themes[0]?.probability,
        pathCount: 81,
        aggressiveness,
      });
      setSim(res.simulation);
    } catch {
      setSim(scenarios ?? null);
    } finally {
      setSimBusy(false);
    }
  }

  async function savePrefs(next: {
    themeWatchlist: NonNullable<HomeBriefing["themeWatchlist"]>;
    alertRules: NonNullable<HomeBriefing["alertRules"]>;
  }) {
    setPrefsBusy(true);
    try {
      await apiPut("/intel/prefs", { prefs: next });
      onPrefsChanged?.();
      window.dispatchEvent(new Event("motivefx:alerts-refresh"));
    } catch {
      /* guest / offline — keep local briefing view */
    } finally {
      setPrefsBusy(false);
    }
  }

  async function addTheme(theme: { id: string; theme: string; probability?: number }) {
    const existing = briefing.themeWatchlist ?? [];
    if (existing.some((t) => t.theme.toLowerCase() === theme.theme.toLowerCase())) return;
    await savePrefs({
      themeWatchlist: [
        ...existing,
        {
          id: theme.id,
          theme: theme.theme,
          source: "user",
          probability: theme.probability,
          addedAt: new Date().toISOString(),
        },
      ],
      alertRules: briefing.alertRules ?? [],
    });
  }

  async function removeTheme(id: string) {
    await savePrefs({
      themeWatchlist: (briefing.themeWatchlist ?? []).filter((t) => t.id !== id),
      alertRules: briefing.alertRules ?? [],
    });
  }

  async function toggleRule(id: string) {
    const rules = (briefing.alertRules ?? []).map((r) =>
      r.id === id ? { ...r, enabled: !r.enabled } : r
    );
    await savePrefs({
      themeWatchlist: briefing.themeWatchlist ?? [],
      alertRules: rules,
    });
  }

  return (
    <div className="phase2-intel" id="phase2-intel">
      {graph && (
        <SignalGraphRadial
          graph={graph}
          activeNodeId={activeNode}
          onSelectNode={setActiveNode}
          onInspectLink={onInspectGraphLink}
        />
      )}

      {themes.length > 0 && (
        <section className="home-section phase2-card">
          <div className="home-section-header">
            <h2>
              <Radar size={18} /> Probability Engine
            </h2>
            <span className="home-section-sub">Tap a theme for related watches · calibration deltas</span>
          </div>
          <div className="phase2-theme-grid">
            {themes.slice(0, 3).map((t) => (
              <ThemeCard
                key={t.id}
                view={t}
                onWatch={() => void addTheme(t)}
                onOpen={() => onInspectTheme?.(t)}
                busy={prefsBusy}
              />
            ))}
          </div>
        </section>
      )}

      <section className="home-section phase2-card">
        <div className="home-section-header">
          <h2>
            <Plus size={18} /> Theme Watchlist
          </h2>
          <span className="home-section-sub">Personalized predictive themes</span>
        </div>
        {(briefing.themeWatchlist?.length ?? 0) === 0 && (
          <p className="phase2-muted">No themes yet — add from Probability Engine or suggestions below.</p>
        )}
        <ul className="phase2-watch-list">
          {(briefing.themeWatchlist ?? []).map((t) => (
            <li key={t.id}>
              <div>
                <strong>{t.theme}</strong>
                <span className="phase2-muted">
                  {t.probability != null ? `${t.probability}%` : "—"}
                  {t.deltaVsPrior != null ? ` · Δ ${t.deltaVsPrior > 0 ? "+" : ""}${t.deltaVsPrior}` : ""}
                </span>
              </div>
              <button type="button" className="btn btn-sm btn-ghost" onClick={() => void removeTheme(t.id)}>
                Remove
              </button>
            </li>
          ))}
        </ul>
        {(briefing.themeSuggestions?.length ?? 0) > 0 && (
          <>
            <p className="phase2-muted" style={{ marginTop: "0.75rem" }}>
              Suggested from live Probability Engine
            </p>
            <div className="phase2-chip-list">
              {briefing.themeSuggestions!.slice(0, 4).map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className="phase2-node"
                  disabled={prefsBusy}
                  onClick={() => void addTheme(s)}
                  title={s.reason}
                >
                  + {s.theme.slice(0, 42)} ({s.probability}%)
                </button>
              ))}
            </div>
          </>
        )}
      </section>

      {breaks.length > 0 && (
        <section className="home-section phase2-card">
          <div className="home-section-header">
            <h2>
              <Zap size={18} /> Consensus Break
            </h2>
            <span className="home-section-sub">Divergence history · where the story may be wrong</span>
          </div>
          {breaks.map((b) => (
            <BreakCard key={b.id} item={b} />
          ))}
          {(briefing.consensusHistory?.length ?? 0) > 0 && (
            <p className="phase2-muted" style={{ marginTop: "0.75rem" }}>
              Recent avg divergence:{" "}
              {briefing.consensusHistory!
                .slice(-4)
                .map((h) => h.avgDivergence)
                .join(" → ")}
            </p>
          )}
        </section>
      )}

      <section className="home-section phase2-card">
        <div className="home-section-header">
          <h2>
            <GitBranch size={18} /> Future Simulator
          </h2>
          <span className="home-section-sub">Seed · horizon · ensemble paths</span>
        </div>
        <label className="phase2-field">
          <span>Seed event</span>
          <input
            value={seed}
            onChange={(e) => setSeed(e.target.value)}
            placeholder="What if …"
          />
        </label>
        <div className="phase2-sim-row">
          <label className="phase2-field">
            <span>Horizon</span>
            <select value={horizon} onChange={(e) => setHorizon(e.target.value)}>
              {HORIZONS.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
          </label>
          <label className="phase2-field">
            <span>Stance</span>
            <select
              value={aggressiveness}
              onChange={(e) => setAggressiveness(e.target.value as typeof aggressiveness)}
            >
              <option value="conservative">Conservative</option>
              <option value="base">Base</option>
              <option value="aggressive">Aggressive</option>
            </select>
          </label>
        </div>
        <button
          type="button"
          className="btn btn-sm btn-ghost"
          disabled={simBusy}
          onClick={() => void runSimulator()}
        >
          <Sparkles size={14} /> {simBusy ? "Simulating…" : "Run branches"}
        </button>
        <p className="phase2-seed">{sim?.seedEvent ?? scenarios?.seedEvent}</p>
        {(sim ?? scenarios)?.ensembleNote && (
          <p className="phase2-muted">{(sim ?? scenarios)?.ensembleNote}</p>
        )}
        <div className="phase2-branches">
          {(sim ?? scenarios)?.branches.map((br) => (
            <article key={br.id} className="phase2-branch">
              <div className="phase2-branch-top">
                <strong>{br.label}</strong>
                <span>{br.probability}%</span>
              </div>
              <ul>
                {br.effects.slice(0, 3).map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
        <p className="home-scenario-footnote">
          {(sim ?? scenarios)?.disclaimer ??
            "Educational scenario branches only — not forecasts or financial advice."}
        </p>
      </section>

      <section className="home-section phase2-card">
        <div className="home-section-header">
          <h2>
            <Bell size={18} /> Predictive Alerts
          </h2>
          <span className="home-section-sub">Rules on evolving signals · Pro+ push</span>
        </div>
        <ul className="phase2-watch-list">
          {(briefing.alertRules ?? []).map((r) => (
            <li key={r.id}>
              <div>
                <strong>{r.label ?? r.kind}</strong>
                <span className="phase2-muted">
                  threshold {r.threshold} · {r.enabled ? "on" : "off"}
                </span>
              </div>
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                disabled={prefsBusy}
                onClick={() => void toggleRule(r.id)}
              >
                {r.enabled ? "Disable" : "Enable"}
              </button>
            </li>
          ))}
        </ul>
        <p className="phase2-muted">
          When rules fire, they upsert into your alerts inbox (push notifications on Pro+).
        </p>
      </section>

      {(briefing.marketGenomes?.length ?? 0) > 0 && (
        <section className="home-section phase2-card">
          <div className="home-section-header">
            <h2>
              <Sparkles size={18} /> Market Genome
            </h2>
            <span className="home-section-sub">Trait map for radar hits</span>
          </div>
          <div className="phase2-genome-grid">
            {briefing.marketGenomes!.slice(0, 4).map((g) => (
              <article key={`${g.module}-${g.symbol}`} className="phase2-genome">
                <strong>{g.symbol}</strong>
                <span className="phase2-muted">{g.relatedThemes.slice(0, 2).join(" · ")}</span>
                <div className="phase2-chip-list compact">
                  {g.relatedNodes.slice(0, 3).map((n) => (
                    <span key={n}>{n}</span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function ThemeCard({
  view,
  onWatch,
  onOpen,
  busy,
}: {
  view: ProbabilityView;
  onWatch: () => void;
  onOpen?: () => void;
  busy: boolean;
}) {
  return (
    <article className={`phase2-theme${onOpen ? " is-clickable" : ""}`}>
      <button type="button" className="phase2-theme-hit" onClick={() => onOpen?.()} disabled={!onOpen}>
        <div className="phase2-theme-top">
          <span className="phase2-dir">{view.direction}</span>
          <span>{view.probability}%</span>
        </div>
        <h3>{view.theme}</h3>
        <p className="phase2-muted">
          Confidence {view.confidence}%
          {view.timing ? ` · ${view.timing}` : ""}
          {view.deltaVsPrior != null
            ? ` · Δ ${view.deltaVsPrior > 0 ? "+" : ""}${view.deltaVsPrior}`
            : ""}
        </p>
        <ul>
          {view.beneficiaries.slice(0, 3).map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
        {onOpen && <p className="phase2-theme-tap">Tap for related watches →</p>}
      </button>
      <button type="button" className="btn btn-sm btn-ghost" disabled={busy} onClick={onWatch}>
        + Watch theme
      </button>
    </article>
  );
}

function BreakCard({ item }: { item: ConsensusBreak }) {
  return (
    <article className="phase2-break">
      <div className="phase2-break-top">
        <strong>Divergence {item.divergenceScore}</strong>
        {item.relatedSymbols[0] && <span>{item.relatedSymbols[0]}</span>}
      </div>
      <p className="phase2-claim">{item.claim}</p>
      <p className="phase2-muted">{item.breakReason}</p>
      {item.deltaVsPrior != null && (
        <p className="phase2-muted">
          Δ vs prior: {item.deltaVsPrior > 0 ? "+" : ""}
          {item.deltaVsPrior}
        </p>
      )}
    </article>
  );
}
