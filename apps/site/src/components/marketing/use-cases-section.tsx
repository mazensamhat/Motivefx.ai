import Link from "next/link";
import { USE_CASES } from "@/lib/marketing-copy";

export function UseCasesSection() {
  return (
    <section className="section-pad" id="use-cases">
      <div className="mx-auto max-w-6xl px-4">
        <div className="section-header text-center mx-auto max-w-2xl">
          <p className="section-kicker">Market Intelligence</p>
          <h2 className="section-title">One Category. Many Desks.</h2>
          <p className="section-sub">
            Not “another AI that does everything.” Predictive market intelligence — applied wherever
            signals cascade.
          </p>
        </div>

        <div className="use-cases-grid">
          {USE_CASES.map((u) => (
            <article key={u.title} className="use-case-item">
              <h3>{u.title}</h3>
              <p>{u.desc}</p>
            </article>
          ))}
        </div>

        <p className="mt-8 text-center text-sm text-slate-400">
          Deep methodology:{" "}
          <Link href="/motive-signal" className="text-brand-green underline-offset-2 hover:underline">
            Motive Signal™
          </Link>
          {" · "}
          <Link href="/limitations" className="text-brand-green underline-offset-2 hover:underline">
            Methods &amp; limitations
          </Link>
        </p>
      </div>
    </section>
  );
}
