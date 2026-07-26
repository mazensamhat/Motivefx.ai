import Link from "next/link";
import { ECOSYSTEM } from "@/lib/marketing-copy";
import { MOTIVE_FAMILY_LINKS } from "@/lib/motive-family";

export function EcosystemSection() {
  return (
    <section className="section-pad ecosystem-section border-t border-white/5">
      <div className="mx-auto max-w-6xl px-4">
        <div className="section-header text-center mx-auto max-w-xl">
          <p className="section-kicker">Ecosystem</p>
          <h2 className="section-title">The Motive Ecosystem</h2>
          <p className="section-desc mt-3">
            Sister tools under Motive Corp — Life, Pulse, IQ, and FX.
          </p>
        </div>
        <ul className="ecosystem-grid">
          {ECOSYSTEM.map((e) => {
            const external = e.href.startsWith("http");
            const className = `ecosystem-card ${e.active ? "active" : ""}`;
            return (
              <li key={e.name}>
                {external ? (
                  <a
                    href={e.href}
                    className={className}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <strong>{e.name}</strong>
                    <span>{e.role}</span>
                  </a>
                ) : (
                  <Link href={e.href} className={className}>
                    <strong>{e.name}</strong>
                    <span>{e.role}</span>
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

export function MobileSection() {
  return (
    <section className="section-pad mobile-section">
      <div className="mx-auto max-w-6xl px-4 grid gap-10 lg:grid-cols-2 lg:items-center">
        <div>
          <p className="section-kicker">Mobile</p>
          <h2 className="section-title">Intelligence in your pocket</h2>
          <p className="section-desc">
            Native apps rolling out on iOS and Android. Voice briefings, push alerts, and Apple Watch
            glances — same Motive Signal, anywhere.
          </p>
          <div className="store-buttons">
            <span className="store-badge">App Store — soon</span>
            <span className="store-badge">Google Play — soon</span>
          </div>
        </div>
        <div className="mobile-mock" aria-hidden>
          <div className="phone-frame">
            <div className="phone-screen">
              <p className="phone-greeting">MotiveFX</p>
              <p className="phone-signal">NVDA · Signal 92</p>
              <div className="phone-chart" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Compact family strip — used near footers / legal bars. */
export function MotiveFamilyStrip() {
  return (
    <p className="motive-family-strip">
      {MOTIVE_FAMILY_LINKS.map((b, i) => (
        <span key={b.id}>
          {i > 0 ? " · " : null}
          {b.current ? (
            <span title={b.tagline}>{b.name}</span>
          ) : (
            <a href={b.href} target="_blank" rel="noopener noreferrer" title={b.tagline}>
              {b.name}
            </a>
          )}
        </span>
      ))}
    </p>
  );
}
