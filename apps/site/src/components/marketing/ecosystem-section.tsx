import Link from "next/link";
import { ECOSYSTEM } from "@/lib/marketing-copy";

export function EcosystemSection() {
  return (
    <section className="section-pad ecosystem-section border-t border-white/5">
      <div className="mx-auto max-w-6xl px-4">
        <div className="section-header text-center mx-auto max-w-xl">
          <p className="section-kicker">Ecosystem</p>
          <h2 className="section-title">The Motive Ecosystem</h2>
        </div>
        <ul className="ecosystem-grid">
          {ECOSYSTEM.map((e) => (
            <li key={e.name}>
              <Link href={e.href} className={`ecosystem-card ${e.active ? "active" : ""}`}>
                <strong>{e.name}</strong>
                <span>{e.role}</span>
              </Link>
            </li>
          ))}
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
