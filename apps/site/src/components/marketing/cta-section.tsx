import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FINAL_CTA_ACCENT, FINAL_CTA_HEADLINE, FINAL_CTA_SUB } from "@/lib/marketing-copy";
import { StoreBadges } from "./store-badges";

export function CtaSection() {
  return (
    <section className="cta-section section-pad">
      <div className="mx-auto max-w-4xl px-4 text-center">
        <div className="cta-panel">
          <p className="section-kicker">See them first</p>
          <h2 className="text-3xl sm:text-4xl font-semibold text-white mt-2 mb-3">
            {FINAL_CTA_HEADLINE}
            <br />
            <span className="text-brand-green">{FINAL_CTA_ACCENT}</span>
          </h2>
          <p className="text-slate-400 max-w-xl mx-auto mb-8">{FINAL_CTA_SUB}</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button href="/demo" size="lg" variant="green">
              See Today&apos;s Signals
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Button>
            <Button href="/pricing" size="lg" variant="secondary">
              Unlock MotiveFX
            </Button>
          </div>
          <div className="mt-6 flex justify-center">
            <StoreBadges />
          </div>
          <p className="mt-5 text-sm text-slate-400">
            Building for a desk or API?{" "}
            <a href="/pricing#ultra-plus" className="text-brand-green underline-offset-2 hover:underline">
              Choose Ultra+
            </a>
            {" · "}
            <a href="/pricing#elite" className="text-brand-green underline-offset-2 hover:underline">
              Elite VIP onboarding
            </a>
          </p>
        </div>
      </div>
    </section>
  );
}
