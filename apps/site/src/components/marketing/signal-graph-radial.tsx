"use client";

import { useMemo, useState } from "react";
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
import { CONNECTED_NODES } from "@/lib/marketing-copy";

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
};

type HubId = (typeof CONNECTED_NODES)[number]["id"];

/**
 * Radial Signal Graph™ — hub + spoke visual matching product brand frames.
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

  const layout = useMemo(() => {
    const cx = 200;
    const cy = 200;
    const r = 118;
    return satellites.map((label, i) => {
      const angle = (-Math.PI / 2) + (i * (2 * Math.PI)) / satellites.length;
      return {
        label,
        x: cx + Math.cos(angle) * r,
        y: cy + Math.sin(angle) * r,
        angle,
      };
    });
  }, [satellites]);

  // Strongest spoke highlighted (Energy when Oil hub, else first)
  const hotLabel =
    satellites.find((s) => s.toLowerCase() === "energy") ?? satellites[0] ?? "";

  return (
    <div className="signal-graph-radial">
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

      <div className="signal-graph-stage">
        <svg className="signal-graph-svg" viewBox="0 0 400 400" role="img" aria-label={`Signal graph centered on ${hub.label}`}>
          <defs>
            <radialGradient id="hubGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ff9f43" stopOpacity="0.95" />
              <stop offset="55%" stopColor="#e67e22" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#e67e22" stopOpacity="0" />
            </radialGradient>
            <filter id="softGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3.5" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* faint rings */}
          <circle cx="200" cy="200" r="52" fill="none" stroke="rgba(255,159,67,0.25)" strokeWidth="1" />
          <circle cx="200" cy="200" r="64" fill="none" stroke="rgba(255,159,67,0.12)" strokeWidth="1" strokeDasharray="3 5" />

          {layout.map((node) => {
            const hot = node.label === hotLabel;
            return (
              <line
                key={`line-${node.label}`}
                x1="200"
                y1="200"
                x2={node.x}
                y2={node.y}
                className={hot ? "sg-spoke hot" : "sg-spoke"}
                filter="url(#softGlow)"
              />
            );
          })}

          <circle cx="200" cy="200" r="38" fill="url(#hubGlow)" filter="url(#softGlow)" />
          <circle cx="200" cy="200" r="38" fill="none" stroke="rgba(255,200,120,0.7)" strokeWidth="2" />
          <text x="200" y="206" textAnchor="middle" className="sg-hub-label">
            {hub.label.toUpperCase()}
          </text>

          {layout.map((node) => {
            const hot = node.label === hotLabel;
            return (
              <g key={node.label} transform={`translate(${node.x}, ${node.y})`}>
                <circle r="22" className={hot ? "sg-sat hot" : "sg-sat"} filter="url(#softGlow)" />
              </g>
            );
          })}
        </svg>

        <ul className="signal-graph-sat-labels">
          {layout.map((node) => {
            const Icon = ICON_BY_LABEL[node.label] ?? Zap;
            const hot = node.label === hotLabel;
            const left = `${(node.x / 400) * 100}%`;
            const top = `${(node.y / 400) * 100}%`;
            return (
              <li
                key={node.label}
                className={hot ? "hot" : ""}
                style={{ left, top }}
              >
                <span className="sg-sat-icon">
                  <Icon size={14} aria-hidden />
                </span>
                <span className="sg-sat-name">{node.label.toUpperCase()}</span>
              </li>
            );
          })}
        </ul>
      </div>

      <p className="signal-graph-caption">{caption}</p>
    </div>
  );
}
