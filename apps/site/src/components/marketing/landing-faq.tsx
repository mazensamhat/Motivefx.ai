"use client";

import { useState } from "react";
import Link from "next/link";
import { LANDING_FAQS } from "@/content/faq/items";
import { SITE } from "@/lib/site-config";

export function LandingFaq() {
  const items = LANDING_FAQS;
  const [open, setOpen] = useState(0);

  return (
    <section className="section-pad landing-faq border-t border-white/5">
      <div className="mx-auto max-w-3xl px-4">
        <div className="section-header text-center">
          <p className="section-kicker">FAQ</p>
          <h2 className="section-title">Why Investors Trust MotiveFX.AI</h2>
          <p className="section-desc mx-auto mt-3">
            {SITE.description} MotiveFX.AI is part of Motive Corp. It publishes informational research
            only — not a broker, investment advisor, or sportsbook.
          </p>
        </div>
        <dl className="faq-accordion">
          {items.map((f, i) => {
            const isOpen = open === i;
            return (
              <div key={f.question} className={`faq-accordion-item ${isOpen ? "open" : ""}`}>
                <dt>
                  <button type="button" onClick={() => setOpen(isOpen ? -1 : i)} aria-expanded={isOpen}>
                    {f.question}
                  </button>
                </dt>
                <dd hidden={!isOpen}>{f.answer}</dd>
              </div>
            );
          })}
        </dl>
        <p className="text-center mt-6">
          <Link href="/faq" className="text-brand-green hover:underline text-sm">
            View all FAQs →
          </Link>
        </p>
      </div>
    </section>
  );
}
