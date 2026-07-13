import Link from "next/link";
import {
  BarChart3,
  Brain,
  Globe,
  HelpCircle,
  Radio,
  Smartphone,
} from "lucide-react";
import { FEATURES } from "@/lib/marketing-copy";

const ICONS = {
  brief: BarChart3,
  why: HelpCircle,
  markets: Globe,
  signal: Radio,
  memory: Brain,
  everywhere: Smartphone,
} as const;

export function FeaturesSection() {
  return (
    <section id="features" className="section-pad">
      <div className="mx-auto max-w-6xl px-4">
        <div className="section-header text-center mx-auto max-w-2xl">
          <p className="section-kicker">Platform</p>
          <h2 className="section-title">AI Intelligence That Works For You</h2>
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
                    Learn about Motive Signal →
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
