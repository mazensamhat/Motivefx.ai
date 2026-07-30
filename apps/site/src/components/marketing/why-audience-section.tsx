import { Check } from "lucide-react";
import { AUDIENCE_CARDS, EVIDENCE_PILLARS, WHY_PROFESSIONALS } from "@/lib/marketing-copy";

export function WhyProfessionalsSection() {
  return (
    <section className="section-pad blueprint-section">
      <div className="mx-auto max-w-6xl px-4 grid gap-12 lg:grid-cols-2">
        <div>
          <p className="section-kicker">Why MotiveFX</p>
          <h2 className="section-title">Why Professionals Use MotiveFX</h2>
          <p className="section-sub text-left">
            We don&apos;t promise certainty. We deliver better context — so you spend less time filtering
            noise and more time understanding what is changing.
          </p>
          <ul className="why-list">
            {WHY_PROFESSIONALS.map((item) => (
              <li key={item}>
                <Check className="h-4 w-4 text-brand-green" aria-hidden />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="section-kicker">Transparency</p>
          <h2 className="section-title">Built On Evidence</h2>
          <div className="evidence-grid">
            {EVIDENCE_PILLARS.map((p) => (
              <article key={p.title} className="evidence-card">
                <h3>{p.title}</h3>
                <p>{p.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export function AudienceSection() {
  return (
    <section className="section-pad blueprint-section blueprint-section-alt">
      <div className="mx-auto max-w-6xl px-4">
        <div className="section-header text-center mx-auto max-w-2xl">
          <p className="section-kicker">Who It&apos;s For</p>
          <h2 className="section-title">Same Intelligence. Tailored Workflows.</h2>
          <p className="section-sub">
            Investing is one application of market intelligence — not the whole product.
          </p>
        </div>
        <div className="audience-grid">
          {AUDIENCE_CARDS.map((c) => (
            <article key={c.title} className="audience-card">
              <h3>{c.title}</h3>
              <p>{c.desc}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
