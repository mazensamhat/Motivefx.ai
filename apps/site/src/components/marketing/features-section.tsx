import Link from "next/link";
import {
  BarChart3,
  Brain,
  Fingerprint,
  Globe,
  HelpCircle,
  Radio,
} from "lucide-react";
import { FEATURES } from "@/lib/marketing-copy";

const ICONS = {
  brief: BarChart3,
  why: HelpCircle,
  markets: Globe,
  signal: Radio,
  memory: Fingerprint,
  everywhere: Brain,
} as const;

export function FeaturesSection() {
  return (
    <section id="features" className="section-pad">
      <div className="mx-auto max-w-6xl px-4">
        <div className="section-header text-center mx-auto max-w-2xl">
          <p className="section-kicker">After the dream</p>
          <h2 className="section-title">The Language Of MotiveFX</h2>
          <p className="section-sub">
            Features exist to reinforce the category — predictive market intelligence — not to sell
            widgets in the first breath.
          </p>
        </div>

        <div className="features-grid-landing">
          {FEATURES.map((f) => {
            const Icon = ICONS[f.icon];
            return (
              <article key={f.title} className="feature-card-landing">
                <span className="feature-icon-green">
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <h3>{f.title}</h3>
                <p>{f.description}</p>
                {f.title === "Motive Signal™" && (
                  <Link href="/motive-signal" className="feature-link">
                    Make Motive Signal your language →
                  </Link>
                )}
                {f.title === "Opportunity Radar™" && (
                  <Link href="/opportunity-radar" className="feature-link">
                    Full Opportunity Radar page →
                  </Link>
                )}
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
