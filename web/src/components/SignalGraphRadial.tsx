import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  Car,
  DollarSign,
  Home,
  LineChart,
  Network,
  Package,
  Ship,
  ShoppingCart,
  Zap,
} from "lucide-react";
import type { SignalGraphPayload } from "../types";

const ICON_BY_LABEL: Record<string, typeof Ship> = {
  Shipping: Ship,
  Construction: Building2,
  Housing: Home,
  Retail: ShoppingCart,
  Currencies: DollarSign,
  Currency: DollarSign,
  Energy: Zap,
  Automotive: Car,
  Inflation: LineChart,
  Banks: Building2,
  Freight: Package,
  Semiconductors: Zap,
  Cloud: Zap,
  Equities: LineChart,
  Labor: Building2,
  Productivity: LineChart,
  Markets: LineChart,
  "Consumer Spending": ShoppingCart,
  Lumber: Home,
  Insurance: Home,
  Employment: Building2,
  Commodities: Package,
  Manufacturing: Building2,
  "Interest Rates": DollarSign,
  "AI CapEx": Zap,
  "AI / Tech": Zap,
};

interface Props {
  graph: SignalGraphPayload;
  activeNodeId: string;
  onSelectNode: (id: string) => void;
}

/** Terminal Signal Graph™ — large radial hub with link explanation. */
export function SignalGraphRadial({ graph, activeNodeId, onSelectNode }: Props) {
  const hub = graph.nodes.find((n) => n.id === activeNodeId) ?? graph.nodes[0];
  const macros = graph.nodes.filter((n) => n.kind === "macro");

  const neighbors = useMemo(() => {
    return graph.edges
      .filter((e) => e.from === activeNodeId)
      .map((e) => ({
        ...e,
        label: graph.nodes.find((n) => n.id === e.to)?.label ?? e.to,
      }))
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 8);
  }, [graph, activeNodeId]);

  const hot = neighbors[0]?.label ?? "";
  const topTo = neighbors[0]?.to ?? "";
  const [focusTo, setFocusTo] = useState(topTo);

  useEffect(() => {
    setFocusTo(topTo);
  }, [activeNodeId, topTo]);

  const focus = neighbors.find((n) => n.to === focusTo) ?? neighbors[0];

  const layout = useMemo(() => {
    const cx = 260;
    const cy = 260;
    const r = 168;
    const n = Math.max(neighbors.length, 1);
    return neighbors.map((edge, i) => {
      const angle = -Math.PI / 2 + (i * (2 * Math.PI)) / n;
      return {
        ...edge,
        x: cx + Math.cos(angle) * r,
        y: cy + Math.sin(angle) * r,
        lx: cx + Math.cos(angle) * (r + 52),
        ly: cy + Math.sin(angle) * (r + 52),
      };
    });
  }, [neighbors]);

  return (
    <section className="home-section phase2-card signal-graph-panel signal-graph-panel--xl" id="signal-graph">
      <div className="home-section-header">
        <h2>
          <Network size={18} /> Signal Graph™
        </h2>
        <span className="home-section-sub">and where the next opportunity is forming.</span>
      </div>

      <div className="signal-graph-hub-switch" role="tablist" aria-label="Hub signal">
        {macros.map((n) => (
          <button
            key={n.id}
            type="button"
            role="tab"
            aria-selected={n.id === activeNodeId}
            className={n.id === activeNodeId ? "active" : ""}
            onClick={() => onSelectNode(n.id)}
          >
            {n.label}
          </button>
        ))}
      </div>

      <div className="signal-graph-layout">
        <div className="signal-graph-stage signal-graph-stage--xl" key={activeNodeId}>
          <svg
            className="signal-graph-svg"
            viewBox="0 0 520 520"
            role="img"
            aria-label={`Signal graph centered on ${hub?.label ?? "hub"}`}
          >
            <defs>
              <radialGradient id="termHubGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#ffb347" stopOpacity="1" />
                <stop offset="50%" stopColor="#e67e22" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#e67e22" stopOpacity="0" />
              </radialGradient>
              <filter id="termSoftGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="4" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            <circle
              className="sg-orbit sg-orbit--inner"
              cx="260"
              cy="260"
              r="72"
              fill="none"
              stroke="rgba(255,159,67,0.28)"
              strokeWidth="1.5"
            />
            <circle
              className="sg-orbit sg-orbit--outer"
              cx="260"
              cy="260"
              r="88"
              fill="none"
              stroke="rgba(255,159,67,0.14)"
              strokeWidth="1"
              strokeDasharray="4 6"
            />

            {layout.map((node, i) => (
              <g key={`spoke-${node.to}`}>
                <line
                  x1="260"
                  y1="260"
                  x2={node.x}
                  y2={node.y}
                  className={`sg-spoke${node.label === hot ? " hot" : ""}${node.to === focus?.to ? " focused" : ""}`}
                  filter="url(#termSoftGlow)"
                  style={{ ["--sg-i" as string]: i }}
                />
                <line
                  x1="260"
                  y1="260"
                  x2={node.x}
                  y2={node.y}
                  className={`sg-spoke-flow${node.label === hot ? " hot" : ""}`}
                  style={{ ["--sg-i" as string]: i }}
                />
              </g>
            ))}

            <g className="sg-hub">
              <circle className="sg-hub-aura" cx="260" cy="260" r="62" fill="rgba(230,126,34,0.18)" />
              <circle
                cx="260"
                cy="260"
                r="54"
                fill="url(#termHubGlow)"
                filter="url(#termSoftGlow)"
                className="sg-hub-core"
              />
              <circle
                cx="260"
                cy="260"
                r="54"
                fill="none"
                stroke="rgba(255,200,120,0.75)"
                strokeWidth="2.5"
                className="sg-hub-ring"
              />
              <text x="260" y="268" textAnchor="middle" className="sg-hub-label sg-hub-label--xl">
                {(hub?.label ?? "HUB").toUpperCase()}
              </text>
            </g>

            {layout.map((node, i) => (
              <g
                key={node.to}
                className="sg-sat-group"
                transform={`translate(${node.x}, ${node.y})`}
                style={{ ["--sg-i" as string]: i }}
              >
                <circle
                  r="30"
                  className={`sg-sat${node.label === hot ? " hot" : ""}${node.to === focus?.to ? " focused" : ""}`}
                  filter="url(#termSoftGlow)"
                />
              </g>
            ))}
          </svg>

          <ul className="signal-graph-sat-labels">
            {layout.map((node, i) => {
              const Icon = ICON_BY_LABEL[node.label] ?? Zap;
              const pct = Math.round(node.weight * 100);
              const focused = node.to === focus?.to;
              return (
                <li
                  key={node.to}
                  className={`${node.label === hot ? "hot" : ""} ${focused ? "focused" : ""}`.trim()}
                  style={{
                    left: `${(node.lx / 520) * 100}%`,
                    top: `${(node.ly / 520) * 100}%`,
                    ["--sg-i" as string]: i,
                  }}
                >
                  <button
                    type="button"
                    className="sg-sat-btn"
                    onClick={() => setFocusTo(node.to)}
                    aria-pressed={focused}
                    aria-label={`${node.label}: ${node.relation}, ${pct}% link`}
                  >
                    <span className="sg-sat-icon sg-sat-icon--xl">
                      <Icon size={18} aria-hidden />
                    </span>
                    <span className="sg-sat-name">{node.label.toUpperCase()}</span>
                    <span className="sg-sat-meta">
                      {pct}% · {node.relation}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {focus && (
          <aside className="signal-graph-info" aria-live="polite">
            <p className="sg-info-kicker">Active cascade</p>
            <h4>
              {(hub?.label ?? "Hub").toUpperCase()}
              <span aria-hidden> → </span>
              {focus.label.toUpperCase()}
            </h4>
            <p className="sg-info-relation">{focus.relation}</p>
            <p className="sg-info-blurb">
              When {(hub?.label ?? "this hub").toLowerCase()} moves, {focus.label.toLowerCase()} feels it through{" "}
              {focus.relation}.
            </p>
            <div className="sg-info-meter" aria-hidden>
              <span style={{ width: `${Math.round(focus.weight * 100)}%` }} />
            </div>
            <p className="sg-info-strength">
              <strong>{Math.round(focus.weight * 100)}%</strong> link strength
              {focus.label === hot ? " · strongest spoke" : ""}
            </p>
            <p className="sg-info-hint">
              Switch hubs above to recenter. Click a satellite to inspect the transmission path.
            </p>
          </aside>
        )}
      </div>

      {neighbors.length === 0 && (
        <p className="phase2-muted">No linked industries for this hub yet.</p>
      )}
    </section>
  );
}
