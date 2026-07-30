import { OPPORTUNITY_RADAR_DEMO } from "@/lib/marketing-copy";

export function OpportunityRadarSection() {
  return (
    <section id="opportunity-radar" className="section-pad blueprint-section">
      <div className="mx-auto max-w-6xl px-4">
        <div className="section-header text-center mx-auto max-w-2xl">
          <p className="section-kicker">Killer Feature</p>
          <h2 className="section-title">Opportunity Radar™</h2>
          <p className="section-sub">
            Instead of hunting tickers, find developing situations — before they become headlines.
          </p>
        </div>

        <div className="radar-grid">
          {OPPORTUNITY_RADAR_DEMO.map((card) => (
            <article key={card.theme} className="radar-card">
              <span className="radar-card-kicker">Emerging Theme</span>
              <h3>{card.theme}</h3>
              <p className="radar-prob">
                Probability <strong>{card.probability}%</strong>
              </p>
              <p className="radar-card-label">Potential beneficiaries</p>
              <ul>
                {card.beneficiaries.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
