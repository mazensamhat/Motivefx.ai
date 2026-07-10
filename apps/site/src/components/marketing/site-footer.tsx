"use client";

import Link from "next/link";
import { BrandLogo } from "@/components/brand/logo";
import { FOOTER_MARKETS, FOOTER_RESOURCES } from "@/lib/marketing-copy";
import { SITE } from "@/lib/site-config";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="footer-newsletter">
          <h2>Stay Ahead of the Market</h2>
          <p>Daily intelligence highlights — no spam.</p>
          <form
            className="newsletter-form"
            onSubmit={(e) => {
              e.preventDefault();
            }}
          >
            <input type="email" placeholder="Enter your email" aria-label="Email" required />
            <button type="submit">Subscribe</button>
          </form>
        </div>

        <div className="footer-columns">
          <BrandLogo />
          <div className="footer-col">
            <p className="footer-heading">Product</p>
            <ul className="footer-links">
              <li><Link href="#features">Features</Link></li>
              <li><Link href="/topics/motive-signal">Motive Signal</Link></li>
              <li><Link href="/pricing">Pricing</Link></li>
              <li><Link href="/tools">Tools</Link></li>
            </ul>
          </div>
          <div className="footer-col">
            <p className="footer-heading">Markets</p>
            <ul className="footer-links">
              {FOOTER_MARKETS.map((m) => (
                <li key={m.href}><Link href={m.href}>{m.label}</Link></li>
              ))}
            </ul>
          </div>
          <div className="footer-col">
            <p className="footer-heading">Resources</p>
            <ul className="footer-links">
              {FOOTER_RESOURCES.map((r) => (
                <li key={r.href}><Link href={r.href}>{r.label}</Link></li>
              ))}
            </ul>
          </div>
          <div className="footer-col">
            <p className="footer-heading">Company</p>
            <ul className="footer-links">
              <li><Link href="/why-motivefx">Why MotiveFX</Link></li>
              <li><Link href="/research-team">Research team</Link></li>
              <li><Link href="/data-sources">Data sources</Link></li>
              <li><a href={`mailto:${SITE.email}`}>Contact</a></li>
            </ul>
          </div>
        </div>

        <div className="footer-brand-lockup">
          <span className="footer-wordmark">
            MOTIVE<span className="text-brand-green">FX</span>.AI
          </span>
        </div>

        <div className="footer-bottom">
          <p>
            © {new Date().getFullYear()} MotiveFX.AI ·{" "}
            <Link href="/privacy">Privacy</Link>
            {" · "}
            <Link href="/data-deletion">Data deletion</Link>
            {" · "}
            Not financial advice.
          </p>
          <p className="footer-disclaimer">
            MotiveFX provides informational market intelligence only. Past performance does not guarantee
            future results. Read our methodology at /data-sources.
          </p>
        </div>
      </div>
    </footer>
  );
}
