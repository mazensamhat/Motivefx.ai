export function HeroDashboard() {
  return (
    <div className="hero-dashboard">
      <div className="hero-dashboard-header">
        <span>Good morning, Mazen</span>
        <span className="hero-dashboard-sub">Here&apos;s what matters today</span>
      </div>

      <div className="hero-dashboard-main">
        <div className="hero-dashboard-card featured">
          <div className="hero-dashboard-card-top">
            <span className="ticker-badge">NVDA</span>
            <span className="signal-pill">Motive Signal · 92</span>
          </div>
          <p className="hero-dashboard-card-title">Today&apos;s Top Opportunity</p>
          <p className="hero-dashboard-card-name">NVIDIA Corporation</p>
          <div className="hero-dashboard-chart-mini" aria-hidden>
            <svg viewBox="0 0 200 48" preserveAspectRatio="none">
              <path
                d="M0,40 L30,32 L60,36 L90,20 L120,24 L150,12 L180,16 L200,8"
                fill="none"
                stroke="#00e676"
                strokeWidth="2"
              />
            </svg>
          </div>
          <span className="confidence-tag">High Confidence</span>
          <button type="button" className="brief-btn">
            Read Research Brief
          </button>
        </div>

        <ul className="hero-dashboard-sidebar">
          {[
            { sym: "BTC", score: 81 },
            { sym: "BILLS", score: 74, extra: "+4.5" },
            { sym: "AAPL", score: 68 },
          ].map((row) => (
            <li key={row.sym}>
              <span>{row.sym}</span>
              {row.extra && <span className="line-move">{row.extra}</span>}
              <span className="score">{row.score}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="hero-dashboard-footer">
        <div className="hero-dashboard-widget">
          <strong>Portfolio Impact</strong>
          <span>NVDA · AAPL holdings</span>
        </div>
        <div className="hero-dashboard-widget">
          <strong>Since You Were Away</strong>
          <span>3 radar hits overnight</span>
        </div>
        <div className="hero-dashboard-widget audio">
          <strong>Motive Daily</strong>
          <span className="audio-bar" aria-hidden />
        </div>
      </div>
    </div>
  );
}
