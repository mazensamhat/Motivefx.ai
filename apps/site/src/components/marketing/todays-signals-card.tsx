"use client";

import {
  ChevronRight,
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

type DemoRow = (typeof TODAYS_SIGNALS_DEMO)[number];

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
  rows?: readonly DemoRow[];
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
            const href = "href" in row ? row.href : "#relationship-graph";
            const hint = "hint" in row ? row.hint : "Explore cascade";
            const blurb = "blurb" in row ? row.blurb : undefined;
            return (
              <li key={row.id}>
                <a
                  className="ts-row is-interactive"
                  href={href}
                  aria-label={`${row.label}, ${row.status}. ${hint}`}
                >
                  <span className="ts-icon">
                    <Icon size={16} aria-hidden />
                  </span>
                  <span className="ts-copy">
                    <span className="ts-label">{row.label}</span>
                    {blurb ? <span className="ts-blurb">{blurb}</span> : null}
                    <span className="ts-hint">{hint}</span>
                  </span>
                  <span className={`ts-badge tone-${row.tone}`}>{row.status}</span>
                  <ChevronRight className="ts-chevron" size={16} aria-hidden />
                </a>
              </li>
            );
          })}
        </ul>

        <a
          className="todays-signals-gauge is-interactive"
          href="#relationship-graph"
          aria-label={`Market Confidence ${pct}%. Open Signal Graph`}
        >
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
          <span className="ts-gauge-hint">Open Signal Graph</span>
        </a>
      </div>

      <div className="todays-signals-foot">
        <a className="is-interactive" href="#todays-signals">
          <Crosshair size={16} aria-hidden />
          <strong>{newSignals}</strong>
          <span>New Signals</span>
        </a>
        <a className="is-interactive" href="#opportunity-radar">
          <ShieldCheck size={16} aria-hidden />
          <strong>{growingRisks}</strong>
          <span>Growing Risks</span>
        </a>
        <a className="is-interactive" href="#opportunity-radar">
          <Star size={16} aria-hidden />
          <strong>{emerging}</strong>
          <span>Emerging Opportunity</span>
        </a>
      </div>
    </div>
  );
}
