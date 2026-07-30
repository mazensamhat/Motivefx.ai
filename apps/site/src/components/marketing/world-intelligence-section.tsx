import { WORLD_INTEL_THEMES } from "@/lib/marketing-copy";

/** World Intelligence panel — themes, not ticker tape. */
export function WorldIntelligenceSection() {
  return (
    <section className="section-pad blueprint-section" id="world-intelligence">
      <div className="mx-auto max-w-6xl px-4">
        <div className="section-header text-center mx-auto max-w-2xl">
          <p className="section-kicker">World Intelligence</p>
          <h2 className="section-title">Not Another Ticker Dashboard.</h2>
          <p className="section-sub">
            Emerging intelligence across themes — confidence, momentum, turning points. Ask what the
            Motive Signal is saying about the world, not just a symbol.
          </p>
        </div>

        <div className="world-intel-grid">
          {WORLD_INTEL_THEMES.map((row) => (
            <article key={row.theme} className={`world-intel-row tone-${row.tone}`}>
              <h3>{row.theme}</h3>
              <p>{row.status}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
