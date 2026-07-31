"use client";

import { SignalGraphRadial } from "./signal-graph-radial";

export function ConnectedMarketsSection() {
  return (
    <section id="relationship-graph" className="section-pad blueprint-section">
      <div className="mx-auto max-w-6xl px-4">
        <div className="section-header text-center mx-auto max-w-2xl">
          <p className="section-kicker">Signal Graph™</p>
          <h2 className="section-title">Click A Signal. Watch The World Light Up.</h2>
          <p className="section-sub">
            Radial cascades from a hub driver — Oil, Rates, Housing, AI CapEx — to the sectors that
            move next. This is the visual language of MotiveFX.
          </p>
        </div>

        <div className="signal-graph-shell">
          <SignalGraphRadial initialHub="oil" />
        </div>
      </div>
    </section>
  );
}
