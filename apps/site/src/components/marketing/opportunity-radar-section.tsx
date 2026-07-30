import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OPPORTUNITY_RADAR_DEMO } from "@/lib/marketing-copy";

export function OpportunityRadarSection() {
  return (
    <section id="opportunity-radar" className="section-pad blueprint-section blueprint-section-alt">
      <div className="mx-auto max-w-6xl px-4">
        <div className="section-header text-center mx-auto max-w-2xl">
          <p className="section-kicker">Institutional surface</p>
          <h2 className="section-title">Opportunity Radar™</h2>
          <p className="section-sub">
            Signal detected. Probability. Evidence. Historical analogue. Beneficiaries. Horizon.
            Confidence. Situations — not ticker hunting.
          </p>
        </div>

        <div className="radar-grid radar-grid-deep">
          {OPPORTUNITY_RADAR_DEMO.map((card) => (
            <article key={card.theme} className="radar-card radar-card-deep">
              <span className="radar-card-kicker">Signal detected</span>
              <h3>{card.theme}</h3>
              <div className="radar-metrics">
                <p>
                  Probability <strong>{card.probability}%</strong>
                </p>
                <p>
                  Confidence <strong>{card.confidence}%</strong>
                </p>
                <p>
                  Horizon <strong>{card.horizon}</strong>
                </p>
              </div>
              <p className="radar-card-label">Supporting evidence</p>
              <ul>
                {card.evidence.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
              <p className="radar-analogue">
                Historical analogue · <em>{card.analogue}</em>
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

        <div className="mt-10 text-center">
          <Button href="/opportunity-radar" variant="green" size="lg">
            Explore Opportunity Radar
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Button>
          <p className="mt-3 text-sm text-slate-400">
            Or open the{" "}
            <Link href="/demo" className="text-brand-green underline-offset-2 hover:underline">
              live product preview
            </Link>
            .
          </p>
        </div>
      </div>
    </section>
  );
}
