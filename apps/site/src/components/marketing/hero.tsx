import Link from "next/link";
import { ArrowRight, Brain, CheckCircle2, Play, Sparkles, Target, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  HERO_HEADLINE,
  HERO_HEADLINE_ACCENT,
  HERO_PROPS,
  HERO_SUBHEAD,
  TAGLINE,
} from "@/lib/marketing-copy";
import { HeroDashboard } from "./hero-dashboard";

const PROP_ICONS = {
  ai: Brain,
  personal: Target,
  multi: Sparkles,
  action: Zap,
} as const;

export function Hero() {
  return (
    <section className="hero-section relative overflow-hidden">
      <div className="hero-grid" aria-hidden />
      <div className="hero-glow hero-glow-a" aria-hidden />
      <div className="hero-glow hero-glow-b" aria-hidden />

      <div className="relative mx-auto grid max-w-6xl gap-10 px-4 pb-16 pt-10 lg:grid-cols-2 lg:items-center lg:gap-12 lg:pb-24 lg:pt-14">
        <div>
          <p className="hero-eyebrow-green">
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            {TAGLINE}
          </p>
          <h1 className="hero-title">
            {HERO_HEADLINE}{" "}
            <span className="text-brand-green">{HERO_HEADLINE_ACCENT}</span>
          </h1>
          <p className="hero-sub">{HERO_SUBHEAD}</p>

          <div className="hero-props-grid">
            {HERO_PROPS.map((p) => {
              const Icon = PROP_ICONS[p.icon];
              return (
                <div key={p.title} className="hero-prop">
                  <Icon className="h-4 w-4 text-brand-green shrink-0" aria-hidden />
                  <div>
                    <strong>{p.title}</strong>
                    <span>{p.desc}</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button href="/pricing" size="lg" variant="green">
              Start free trial
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Button>
            <Button href="/demo" variant="secondary" size="lg">
              <Play className="h-4 w-4" aria-hidden />
              Try the preview
            </Button>
          </div>

          <ul className="hero-trust-list">
            {["7-day free trial", "No credit card required", "Cancel anytime"].map((item) => (
              <li key={item}>
                <CheckCircle2 className="h-4 w-4 text-brand-green" aria-hidden />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative mx-auto w-full max-w-lg lg:max-w-none">
          <HeroDashboard />
        </div>
      </div>
    </section>
  );
}
