export function MorningIntelligenceSection() {
  return (
    <section className="section-pad blueprint-section blueprint-section-alt">
      <div className="mx-auto max-w-6xl px-4">
        <div className="section-header text-center mx-auto max-w-2xl">
          <p className="section-kicker">Daily Brief</p>
          <h2 className="section-title">Your Morning Intelligence</h2>
          <p className="section-sub">
            Open MotiveFX and immediately understand what happened overnight — without endless scrolling.
          </p>
        </div>

        <div className="morning-grid">
          <div className="morning-card morning-card-wide">
            <span>Today&apos;s Market Confidence</span>
            <strong>78%</strong>
          </div>
          <div className="morning-card">
            <span>Macro Momentum</span>
            <strong>Neutral</strong>
          </div>
          <div className="morning-card">
            <span>Top Opportunities</span>
            <strong>3</strong>
          </div>
          <div className="morning-card">
            <span>Top Risks</span>
            <strong>2</strong>
          </div>
          <div className="morning-card">
            <span>Most Important Event</span>
            <strong>AI explained</strong>
          </div>
          <div className="morning-card">
            <span>Consensus Break</span>
            <strong>Where belief may be wrong</strong>
          </div>
        </div>
      </div>
    </section>
  );
}
