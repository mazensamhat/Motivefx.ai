import { TodaysSignalsCard } from "./todays-signals-card";

export function MorningIntelligenceSection() {
  return (
    <section className="section-pad blueprint-section blueprint-section-alt" id="todays-signals">
      <div className="mx-auto max-w-6xl px-4">
        <div className="section-header text-center mx-auto max-w-2xl">
          <p className="section-kicker">Daily Brief</p>
          <h2 className="section-title">Today&apos;s Signals</h2>
          <p className="section-sub">
            Theme momentum, Market Confidence, and what formed overnight — the morning intelligence
            stack, not a ticker tape.
          </p>
        </div>

        <div className="todays-signals-shell">
          <TodaysSignalsCard confidencePct={82} newSignals={3} growingRisks={2} emerging={1} />
        </div>
      </div>
    </section>
  );
}
