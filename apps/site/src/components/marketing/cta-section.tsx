import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CtaSection() {
  return (
    <section className="cta-section section-pad">
      <div className="mx-auto max-w-4xl px-4 text-center">
        <div className="cta-panel">
          <p className="section-kicker">Ready?</p>
          <h2 className="text-3xl sm:text-4xl font-semibold text-white mt-2 mb-4">
            Stop scrolling. Start trading with context.
          </h2>
          <p className="text-slate-400 max-w-xl mx-auto mb-8">
            Pick your tier, choose your markets, and open the intelligence terminal built for
            serious operators.
          </p>
          <Button href="/pricing" size="lg">
            Get started
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Button>
        </div>
      </div>
    </section>
  );
}
