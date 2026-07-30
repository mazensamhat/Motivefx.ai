import { MARKET_DNA_DEMO } from "@/lib/marketing-copy";

export function MarketDnaSection() {
  return (
    <section className="section-pad blueprint-section blueprint-section-alt" id="market-dna">
      <div className="mx-auto max-w-6xl px-4 grid gap-10 lg:grid-cols-2 lg:items-center">
        <div>
          <p className="section-kicker">Market DNA™</p>
          <h2 className="section-title">Every Asset Has A Personality.</h2>
          <p className="section-sub text-left">
            What usually lifts it. What breaks it. What tends to follow. Sticky intelligence you
            return to — not a one-off chart call.
          </p>
        </div>

        <article className="market-dna-card">
          <header>
            <span className="market-dna-kicker">DNA profile</span>
            <h3>{MARKET_DNA_DEMO.asset}</h3>
          </header>
          <div className="market-dna-cols">
            <div>
              <p className="market-dna-label">Usually reacts positively to</p>
              <ul>
                {MARKET_DNA_DEMO.positive.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="market-dna-label">Negative sensitivity</p>
              <ul>
                {MARKET_DNA_DEMO.negative.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}
