"use client";

import { useState } from "react";
import Link from "next/link";
import { FAQ_ITEMS, faqSlug } from "@/content/faq/items";

function FaqAccordion() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <dl className="faq-accordion">
      {FAQ_ITEMS.map((f, i) => {
        const slug = faqSlug(f.question);
        const isOpen = open === i;
        return (
          <div key={slug} className={`faq-accordion-item ${isOpen ? "open" : ""}`}>
            <dt>
              <button type="button" onClick={() => setOpen(isOpen ? null : i)} aria-expanded={isOpen}>
                {f.question}
              </button>
            </dt>
            {isOpen && (
              <dd>
                {f.answer}{" "}
                <Link href={`/faq/${slug}`} className="faq-permalink">
                  Permalink →
                </Link>
              </dd>
            )}
          </div>
        );
      })}
    </dl>
  );
}

export function FaqHubContent() {
  return (
    <div className="hub-page">
      <header className="hub-header">
        <p className="section-kicker">FAQ</p>
        <h1>Questions investors ask</h1>
        <p className="section-desc">Hundreds of answers — each with its own searchable URL.</p>
      </header>
      <FaqAccordion />
    </div>
  );
}
