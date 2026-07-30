import { useMemo, useState } from "react";
import { GitBranch, Network, Radar, Sparkles, Zap } from "lucide-react";
import type {
  ConsensusBreak,
  FutureScenarios,
  HomeBriefing,
  ProbabilityView,
} from "../types";
import { apiPost } from "../lib/api";

interface Props {
  briefing: HomeBriefing;
}

export function Phase2IntelPanels({ briefing }: Props) {
  const graph = briefing.signalGraph;
  const themes = briefing.probabilityViews ?? [];
  const breaks = briefing.consensusBreaks ?? [];
  const scenarios = briefing.futureScenarios;
  const [activeNode, setActiveNode] = useState(graph?.activeNodeId ?? "rates");
  const [sim, setSim] = useState<FutureScenarios | null>(scenarios ?? null);
  const [simBusy, setSimBusy] = useState(false);

  const neighbors = useMemo(() => {
    if (!graph) return [];
    return graph.edges
      .filter((e) => e.from === activeNode)
      .map((e) => ({
        ...e,
        label: graph.nodes.find((n) => n.id === e.to)?.label ?? e.to,
      }))
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 6);
  }, [graph, activeNode]);

  async function runSimulator() {
    if (!graph) return;
    setSimBusy(true);
    try {
      const res = await apiPost<{ simulation: FutureScenarios }>("/intel/simulate", {
        seedEvent: themes[0] ? `What if “${themes[0].theme}” accelerates?` : scenarios?.seedEvent,
        horizon: themes[0]?.timing ?? scenarios?.horizon,
        nodeId: activeNode,
        symbols: briefing.opportunities.slice(0, 3).map((o) => o.symbol),
        baseProbability: themes[0]?.probability,
      });
      setSim(res.simulation);
    } catch {
      setSim(scenarios ?? null);
    } finally {
      setSimBusy(false);
    }
  }

  return (
    <div className="phase2-intel">
      {graph && (
        <section className="home-section phase2-card">
          <div className="home-section-header">
            <h2>
              <Network size={18} /> Relationship Engine
            </h2>
            <span className="home-section-sub">Signal Graph · second-order links</span>
          </div>
          <div className="phase2-nodes">
            {graph.nodes
              .filter((n) => n.kind === "macro")
              .map((n) => (
                <button
                  key={n.id}
                  type="button"
                  className={`phase2-node ${n.id === activeNode ? "active" : ""}`}
                  onClick={() => setActiveNode(n.id)}
                >
                  {n.label}
                </button>
              ))}
          </div>
          <p className="phase2-muted">When this node moves, watch:</p>
          <ul className="phase2-chip-list">
            {neighbors.map((n) => (
              <li key={`${n.from}-${n.to}`}>
                {n.label}
                <span>{Math.round(n.weight * 100)}%</span>
              </li>
            ))}
            {neighbors.length === 0 && <li>No linked industries for this node.</li>}
          </ul>
        </section>
      )}

      {themes.length > 0 && (
        <section className="home-section phase2-card">
          <div className="home-section-header">
            <h2>
              <Radar size={18} /> Probability Engine
            </h2>
            <span className="home-section-sub">Theme likelihood · evidence trust</span>
          </div>
          <div className="phase2-theme-grid">
            {themes.slice(0, 3).map((t) => (
              <ThemeCard key={t.id} view={t} />
            ))}
          </div>
        </section>
      )}

      {breaks.length > 0 && (
        <section className="home-section phase2-card">
          <div className="home-section-header">
            <h2>
              <Zap size={18} /> Consensus Break
            </h2>
            <span className="home-section-sub">Where the story may be wrong</span>
          </div>
          {breaks.map((b) => (
            <BreakCard key={b.id} item={b} />
          ))}
        </section>
      )}

      <section className="home-section phase2-card">
        <div className="home-section-header">
          <h2>
            <GitBranch size={18} /> Future Simulator
          </h2>
          <span className="home-section-sub">Educational branches only</span>
        </div>
        <p className="phase2-seed">{sim?.seedEvent ?? scenarios?.seedEvent ?? "Pick a theme to simulate."}</p>
        <button
          type="button"
          className="btn btn-sm btn-ghost"
          disabled={simBusy}
          onClick={() => void runSimulator()}
        >
          <Sparkles size={14} /> {simBusy ? "Simulating…" : "Re-run branches"}
        </button>
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

function ThemeCard({ view }: { view: ProbabilityView }) {
  return (
    <article className="phase2-theme">
      <div className="phase2-theme-top">
        <span className="phase2-dir">{view.direction}</span>
        <span>{view.probability}%</span>
      </div>
      <h3>{view.theme}</h3>
      <p className="phase2-muted">Confidence {view.confidence}%{view.timing ? ` · ${view.timing}` : ""}</p>
      <ul>
        {view.beneficiaries.slice(0, 3).map((b) => (
          <li key={b}>{b}</li>
        ))}
      </ul>
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
    </article>
  );
}
