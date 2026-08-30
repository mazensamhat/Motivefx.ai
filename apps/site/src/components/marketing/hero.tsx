import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  BRAND_LINE,
  HERO_EYEBROW,
  HERO_HEADLINE,
  HERO_HEADLINE_ACCENT,
  HERO_SUBHEAD,
  TAGLINE,
} from "@/lib/marketing-copy";
import { IOS_APP_STORE_URL, PLAY_STORE_URL, STORE_COPY } from "@/lib/store-links";
import { HeroSignalGraph } from "./hero-signal-graph";
import { StoreBadges } from "./store-badges";

export function Hero() {
  return (
    <section className="hero-section hero-section-vision relative overflow-hidden">
      <div className="hero-grid" aria-hidden />
      <div className="hero-glow hero-glow-a" aria-hidden />
      <div className="hero-glow hero-glow-b" aria-hidden />
      <div className="hero-signal-bleed" aria-hidden>
        <HeroSignalGraph />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 pb-20 pt-12 lg:pb-28 lg:pt-16">
        <div className="hero-vision-copy max-w-3xl">
          <p className="hero-brand-mark">{BRAND_LINE}</p>
          <p className="hero-eyebrow-green">{TAGLINE}</p>
          <p className="hero-eyebrow-soft">{HERO_EYEBROW}</p>
          <h1 className="hero-title">
            {HERO_HEADLINE}
            <br />
            <span className="text-brand-green">{HERO_HEADLINE_ACCENT}</span>
          </h1>
          <p className="hero-sub">{HERO_SUBHEAD}</p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button href="/demo" size="lg" variant="green">
              See Today&apos;s Signals
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Button>
            <Button href="#relationship-graph" variant="secondary" size="lg">
              Explore the Relationship Graph
            </Button>
          </div>
          <div className="mt-5">
            <StoreBadges />
          </div>
          <p className="hero-secondary-link">
            <Link href="/motive-signal" className="text-brand-green underline-offset-2 hover:underline">
              What is Motive Signal™?
            </Link>
            {" · "}
            <Link href="/pricing" className="text-brand-green underline-offset-2 hover:underline">
              View plans
            </Link>
            {" · "}
            <a
              href={IOS_APP_STORE_URL}
              className="text-brand-green underline-offset-2 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
              aria-label={STORE_COPY.iosAria}
            >
              Download on the App Store
            </a>
            {" · "}
            <a
              href={PLAY_STORE_URL}
              className="text-brand-green underline-offset-2 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
              aria-label={STORE_COPY.playAria}
            >
              Get it on Google Play
            </a>
          </p>

          <ul className="hero-trust-list">
            {["Predictive intelligence — not another research tab", "Evidence with every view", "Cancel anytime"].map(
              (item) => (
                <li key={item}>
                  <CheckCircle2 className="h-4 w-4 text-brand-green" aria-hidden />
                  {item}
                </li>
              )
            )}
          </ul>
        </div>
      </div>
    </section>
  );
}
