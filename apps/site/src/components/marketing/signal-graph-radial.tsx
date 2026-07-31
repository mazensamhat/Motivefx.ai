"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  Car,
  DollarSign,
  Home,
  LineChart,
  Package,
  Ship,
  ShoppingCart,
  Zap,
} from "lucide-react";
import { CONNECTED_NODES, signalLinkMeta } from "@/lib/marketing-copy";

const ICON_BY_LABEL: Record<string, typeof Ship> = {
  Shipping: Ship,
  Construction: Building2,
  Housing: Home,
  Retail: ShoppingCart,
  Currencies: DollarSign,
  Energy: Zap,
  Automotive: Car,
  Inflation: LineChart,
  Banks: Building2,
  Freight: Package,
  "Interest Rates": DollarSign,
  "AI CapEx": Zap,
  Semiconductors: Zap,
  Equities: LineChart,
  Cloud: Zap,
  Labor: Building2,
  Productivity: LineChart,
  Markets: LineChart,
  "Consumer Spending": ShoppingCart,
  Lumber: Home,
  Insurance: Home,
  Employment: Building2,
  Commodities: Package,
  Manufacturing: Building2,
};

type HubId = (typeof CONNECTED_NODES)[number]["id"];

/**
 * Radial Signal Graph™ — large hub + spoke with link strength and explanation.
 */
export function SignalGraphRadial({
  initialHub = "oil",
  caption = "and where the next opportunity is forming.",
}: {
  initialHub?: HubId;
  caption?: string;
}) {
  const [hubId, setHubId] = useState<HubId>(initialHub);
  const hub = CONNECTED_NODES.find((n) => n.id === hubId) ?? CONNECTED_NODES[0];
  const satellites = hub.connected.slice(0, 8);

  const ranked = useMemo(() => {
    return satellites
      .map((label) => {
        const meta = signalLinkMeta(hub.label, label);
        return { label, ...meta };
      })
      .sort((a, b) => b.weight - a.weight);
  }, [hub.label, satellites]);

  const [focusLabel, setFocusLabel] = useState(ranked[0]?.label ?? "");
  const topLabel = ranked[0]?.label ?? "";

  useEffect(() => {
    setFocusLabel(topLabel);
  }, [hubId, topLabel]);

  const hotLabel = topLabel;
  const focus = ranked.find((n) => n.label === focusLabel) ?? ranked[0];

  const layout = useMemo(() => {
    const cx = 260;
    const cy = 260;
    const r = 168;
    return ranked.map((node, i) => {
      const angle = -Math.PI / 2 + (i * (2 * Math.PI)) / Math.max(ranked.length, 1);
      return {
        ...node,
        angle,
        x: cx + Math.cos(angle) * r,
        y: cy + Math.sin(angle) * r,
        labelR: r + 52,
        lx: cx + Math.cos(angle) * (r + 52),
        ly: cy + Math.sin(angle) * (r + 52),
      };
    });
  }, [ranked]);

  return (
    <div className="signal-graph-radial signal-graph-radial--xl">
      <div className="signal-graph-radial-head">
        <span className="signal-graph-radial-bar" aria-hidden />
        <h3>Signal Graph™</h3>
      </div>

      <div className="signal-graph-hub-switch" role="tablist" aria-label="Hub signal">
        {CONNECTED_NODES.map((n) => (
          <button
            key={n.id}
            type="button"
            role="tab"
            aria-selected={n.id === hubId}
            className={n.id === hubId ? "active" : ""}
            onClick={() => setHubId(n.id)}
          >
            {n.label}
          </button>
        ))}
      </div>

      <div className="signal-graph-layout">
        <div className="signal-graph-stage signal-graph-stage--xl">
          <svg
            className="signal-graph-svg"
            viewBox="0 0 520 520"
            role="img"
            aria-label={`Signal graph centered on ${hub.label}`}
          >
            <defs>
              <radialGradient id="hubGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#ffb347" stopOpacity="1" />
                <stop offset="50%" stopColor="#e67e22" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#e67e22" stopOpacity="0" />
              </radialGradient>
              <filter id="softGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="4" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            <circle cx="260" cy="260" r="72" fill="none" stroke="rgba(255,159,67,0.28)" strokeWidth="1.5" />
            <circle
              cx="260"
              cy="260"
              r="88"
              fill="none"
              stroke="rgba(255,159,67,0.14)"
              strokeWidth="1"
              strokeDasharray="4 6"
            />

            {layout.map((node) => {
              const hot = node.label === hotLabel;
              const focused = node.label === focus?.label;
              return (
                <line
                  key={`line-${node.label}`}
                  x1="260"
                  y1="260"
                  x2={node.x}
                  y2={node.y}
                  className={`sg-spoke${hot ? " hot" : ""}${focused ? " focused" : ""}`}
                  filter="url(#softGlow)"
                />
              );
            })}

            <circle cx="260" cy="260" r="54" fill="url(#hubGlow)" filter="url(#softGlow)" />
            <circle cx="260" cy="260" r="54" fill="none" stroke="rgba(255,200,120,0.75)" strokeWidth="2.5" />
            <text x="260" y="268" textAnchor="middle" className="sg-hub-label sg-hub-label--xl">
              {hub.label.toUpperCase()}
            </text>

            {layout.map((node) => {
              const hot = node.label === hotLabel;
              const focused = node.label === focus?.label;
              return (
                <g key={node.label} transform={`translate(${node.x}, ${node.y})`}>
                  <circle
                    r="30"
                    className={`sg-sat${hot ? " hot" : ""}${focused ? " focused" : ""}`}
                    filter="url(#softGlow)"
                  />
                </g>
              );
            })}
          </svg>

          <ul className="signal-graph-sat-labels">
            {layout.map((node) => {
              const Icon = ICON_BY_LABEL[node.label] ?? Zap;
              const hot = node.label === hotLabel;
              const focused = node.label === focus?.label;
              const pct = Math.round(node.weight * 100);
              return (
                <li
                  key={node.label}
                  className={`${hot ? "hot" : ""} ${focused ? "focused" : ""}`.trim()}
                  style={{ left: `${(node.lx / 520) * 100}%`, top: `${(node.ly / 520) * 100}%` }}
                >
                  <button
                    type="button"
                    className="sg-sat-btn"
                    onClick={() => setFocusLabel(node.label)}
                    aria-pressed={focused}
                    aria-label={`${node.label}: ${node.relation}, ${pct}% link`}
                  >
                    <span className="sg-sat-icon sg-sat-icon--xl">
                      <Icon size={18} aria-hidden />
                    </span>
                    <span className="sg-sat-name">{node.label.toUpperCase()}</span>
                    <span className="sg-sat-meta">{pct}% · {node.relation}</span>
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
              {hub.label.toUpperCase()}
              <span aria-hidden> → </span>
              {focus.label.toUpperCase()}
            </h4>
            <p className="sg-info-relation">{focus.relation}</p>
            <p className="sg-info-blurb">{focus.blurb}</p>
            <div className="sg-info-meter" aria-hidden>
              <span style={{ width: `${Math.round(focus.weight * 100)}%` }} />
            </div>
            <p className="sg-info-strength">
              <strong>{Math.round(focus.weight * 100)}%</strong> link strength
              {focus.label === hotLabel ? " · strongest spoke" : ""}
            </p>
            <p className="sg-info-hint">Click a satellite to inspect how {hub.label} transmits into that sector.</p>
          </aside>
        )}
      </div>

      <p className="signal-graph-caption">{caption}</p>
    </div>
  );
}
