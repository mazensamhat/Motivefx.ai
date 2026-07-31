import { useMemo } from "react";
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
};

interface Props {
  graph: SignalGraphPayload;
  activeNodeId: string;
  onSelectNode: (id: string) => void;
}

/** Terminal Signal Graph™ — radial hub matching brand frames. */
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

  const layout = useMemo(() => {
    const cx = 200;
    const cy = 200;
    const r = 118;
    const n = Math.max(neighbors.length, 1);
    return neighbors.map((edge, i) => {
      const angle = -Math.PI / 2 + (i * (2 * Math.PI)) / n;
      return {
        ...edge,
        x: cx + Math.cos(angle) * r,
        y: cy + Math.sin(angle) * r,
      };
    });
  }, [neighbors]);

  return (
    <section className="home-section phase2-card signal-graph-panel">
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

      <div className="signal-graph-stage">
        <svg
          className="signal-graph-svg"
          viewBox="0 0 400 400"
          role="img"
          aria-label={`Signal graph centered on ${hub?.label ?? "hub"}`}
        >
          <defs>
            <radialGradient id="termHubGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ff9f43" stopOpacity="0.95" />
              <stop offset="55%" stopColor="#e67e22" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#e67e22" stopOpacity="0" />
            </radialGradient>
            <filter id="termSoftGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3.5" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <circle cx="200" cy="200" r="52" fill="none" stroke="rgba(255,159,67,0.25)" strokeWidth="1" />
          <circle
            cx="200"
            cy="200"
            r="64"
            fill="none"
            stroke="rgba(255,159,67,0.12)"
            strokeWidth="1"
            strokeDasharray="3 5"
          />

          {layout.map((node) => (
            <line
              key={`line-${node.to}`}
              x1="200"
              y1="200"
              x2={node.x}
              y2={node.y}
              className={node.label === hot ? "sg-spoke hot" : "sg-spoke"}
              filter="url(#termSoftGlow)"
            />
          ))}

          <circle cx="200" cy="200" r="38" fill="url(#termHubGlow)" filter="url(#termSoftGlow)" />
          <circle cx="200" cy="200" r="38" fill="none" stroke="rgba(255,200,120,0.7)" strokeWidth="2" />
          <text x="200" y="206" textAnchor="middle" className="sg-hub-label">
            {(hub?.label ?? "HUB").toUpperCase()}
          </text>

          {layout.map((node) => (
            <g key={node.to} transform={`translate(${node.x}, ${node.y})`}>
              <circle
                r="22"
                className={node.label === hot ? "sg-sat hot" : "sg-sat"}
                filter="url(#termSoftGlow)"
              />
            </g>
          ))}
        </svg>

        <ul className="signal-graph-sat-labels">
          {layout.map((node) => {
            const Icon = ICON_BY_LABEL[node.label] ?? Zap;
            return (
              <li
                key={node.to}
                className={node.label === hot ? "hot" : ""}
                style={{ left: `${(node.x / 400) * 100}%`, top: `${(node.y / 400) * 100}%` }}
                title={`${node.label} · ${Math.round(node.weight * 100)}% — click to center`}
              >
                <button
                  type="button"
                  className="sg-sat-btn"
                  onClick={() => onSelectNode(node.to)}
                  aria-label={`Center graph on ${node.label}`}
                >
                  <span className="sg-sat-icon">
                    <Icon size={14} aria-hidden />
                  </span>
                  <span className="sg-sat-name">{node.label.toUpperCase()}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {neighbors.length === 0 && (
        <p className="phase2-muted">No linked industries for this hub yet.</p>
      )}
    </section>
  );
}
