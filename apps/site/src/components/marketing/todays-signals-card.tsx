"use client";

import {
  Cpu,
  Crosshair,
  Globe2,
  Home,
  LineChart,
  ShieldCheck,
  Star,
} from "lucide-react";
import { TODAYS_SIGNALS_DEMO } from "@/lib/marketing-copy";

const ICONS = {
  home: Home,
  cpu: Cpu,
  chart: LineChart,
  globe: Globe2,
} as const;

/**
 * Today's Signals glass card — Market Confidence gauge + theme rows + footer counts.
 */
export function TodaysSignalsCard({
  confidencePct = 82,
  newSignals = 3,
  growingRisks = 2,
  emerging = 1,
  rows = TODAYS_SIGNALS_DEMO,
}: {
  confidencePct?: number;
  newSignals?: number;
  growingRisks?: number;
  emerging?: number;
  rows?: readonly {
    id: string;
    label: string;
    status: string;
    tone: "up" | "cool" | "down";
    icon: keyof typeof ICONS;
  }[];
}) {
  const pct = Math.max(0, Math.min(100, Math.round(confidencePct)));
  const circumference = 2 * Math.PI * 54;
  const dash = (pct / 100) * circumference;

  return (
    <div className="todays-signals-card">
      <div className="todays-signals-head">
        <h3>Today&apos;s Signals</h3>
      </div>

      <div className="todays-signals-body">
        <ul className="todays-signals-list">
          {rows.map((row) => {
            const Icon = ICONS[row.icon] ?? Home;
            return (
              <li key={row.id}>
                <span className="ts-icon">
                  <Icon size={16} aria-hidden />
                </span>
                <span className="ts-label">{row.label}</span>
                <span className={`ts-badge tone-${row.tone}`}>{row.status}</span>
              </li>
            );
          })}
        </ul>

        <div className="todays-signals-gauge">
          <p className="ts-gauge-label">Market Confidence</p>
          <div className="ts-gauge-ring">
            <svg viewBox="0 0 140 140" aria-hidden>
              <circle className="ts-gauge-track" cx="70" cy="70" r="54" />
              <circle
                className="ts-gauge-value"
                cx="70"
                cy="70"
                r="54"
                strokeDasharray={`${dash} ${circumference}`}
                transform="rotate(-90 70 70)"
              />
            </svg>
            <strong>{pct}%</strong>
          </div>
        </div>
      </div>

      <div className="todays-signals-foot">
        <div>
          <Crosshair size={16} aria-hidden />
          <strong>{newSignals}</strong>
          <span>New Signals</span>
        </div>
        <div>
          <ShieldCheck size={16} aria-hidden />
          <strong>{growingRisks}</strong>
          <span>Growing Risks</span>
        </div>
        <div>
          <Star size={16} aria-hidden />
          <strong>{emerging}</strong>
          <span>Emerging Opportunity</span>
        </div>
      </div>
    </div>
  );
}
