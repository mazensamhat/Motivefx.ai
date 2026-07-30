export function HeroDashboard() {
  return (
    <div className="hero-dashboard">
      <div className="hero-dashboard-header">
        <span>Daily Brief</span>
        <span className="hero-dashboard-sub">What changed · Why it matters · What to watch</span>
      </div>

      <div className="hero-dashboard-main hero-dashboard-main-brief">
        <div className="hero-dashboard-card featured">
          <div className="hero-dashboard-card-top">
            <span className="ticker-badge">Overnight</span>
            <span className="signal-pill">Market Confidence · 78%</span>
          </div>
          <p className="hero-dashboard-card-title">Today&apos;s Intelligence</p>
          <ul className="hero-brief-list">
            <li>
              <strong>3</strong> new signals
            </li>
            <li>
              <strong>2</strong> growing risks
            </li>
            <li>
              <strong>1</strong> emerging opportunity
            </li>
          </ul>
          <p className="hero-dashboard-card-name">Macro direction · Neutral</p>
          <span className="confidence-tag">Most influential event explained</span>
        </div>

        <ul className="hero-dashboard-sidebar">
          <li>
            <span>Opportunity Radar</span>
            <span className="score">79%</span>
          </li>
          <li>
            <span>Automation theme</span>
            <span className="score">74%</span>
          </li>
          <li>
            <span>Freight signal</span>
            <span className="score">86%</span>
          </li>
        </ul>
      </div>

      <div className="hero-dashboard-footer">
        <div className="hero-dashboard-widget">
          <strong>Top opportunity</strong>
          <span>Industrial automation demand</span>
        </div>
        <div className="hero-dashboard-widget">
          <strong>Top risk</strong>
          <span>Pacific freight costs rising</span>
        </div>
        <div className="hero-dashboard-widget">
          <strong>Evidence</strong>
          <span>Probability · confidence · drivers</span>
        </div>
      </div>
    </div>
  );
}
