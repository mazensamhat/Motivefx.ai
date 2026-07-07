"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, Menu, X } from "lucide-react";
import { BrandLogo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { MARKET_ROUTES, SITE } from "@/lib/site-config";

const PRODUCT_LINKS = [
  { href: "#features", label: "Features" },
  { href: "/topics/motive-signal", label: "Motive Signal" },
  { href: "/ai/how-motive-signal-works", label: "How it works" },
  { href: "/pricing", label: "Pricing" },
];

const RESOURCE_LINKS = [
  { href: "/learn", label: "Learning center" },
  { href: "/glossary", label: "Glossary" },
  { href: "/daily/biggest-movers", label: "Daily briefs" },
  { href: "/compare", label: "Comparisons" },
  { href: "/tools", label: "Tools" },
  { href: "/faq", label: "FAQ" },
];

const COMPANY_LINKS = [
  { href: "/why-motivefx", label: "Why MotiveFX" },
  { href: "/research-team", label: "Research team" },
  { href: "/data-sources", label: "Data sources" },
  { href: `mailto:${SITE.email}`, label: "Contact" },
];

function NavDropdown({
  label,
  links,
}: {
  label: string;
  links: { href: string; label: string }[];
}) {
  return (
    <div className="nav-dropdown group relative">
      <button type="button" className="nav-link inline-flex items-center gap-1">
        {label}
        <ChevronDown className="h-3.5 w-3.5 opacity-60" aria-hidden />
      </button>
      <div className="nav-dropdown-panel">
        {links.map((l) => (
          <Link key={l.href} href={l.href}>
            {l.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

export function SiteNav() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="site-nav sticky top-0 z-50">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:py-4">
        <BrandLogo />

        <nav className="hidden items-center gap-6 lg:flex">
          <NavDropdown label="Product" links={PRODUCT_LINKS} />
          <NavDropdown label="Markets" links={MARKET_ROUTES.map((m) => ({ href: m.href, label: m.label }))} />
          <Link href="/pricing" className="nav-link">
            Pricing
          </Link>
          <NavDropdown label="Resources" links={RESOURCE_LINKS} />
          <NavDropdown label="Company" links={COMPANY_LINKS} />
        </nav>

        <div className="hidden shrink-0 items-center gap-2 sm:gap-3 lg:flex">
          <Button href="/login" variant="ghost" size="sm">
            Sign in
          </Button>
          <Button href="/app" size="sm">
            Open app
          </Button>
        </div>

        <div className="flex shrink-0 items-center gap-1 sm:gap-2 lg:hidden">
          <Button href="/login" variant="ghost" size="sm" className="px-2.5 sm:px-3">
            Sign in
          </Button>
          <button
            type="button"
            className="text-slate-300 p-2"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-expanded={mobileOpen}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="mobile-nav lg:hidden border-t border-white/10 px-4 py-4">
          <div className="mobile-nav-actions">
            <Button href="/login" variant="ghost" className="flex-1" onClick={() => setMobileOpen(false)}>
              Sign in
            </Button>
            <Button href="/app" className="flex-1" onClick={() => setMobileOpen(false)}>
              Open app
            </Button>
          </div>
          {[...PRODUCT_LINKS, ...MARKET_ROUTES.map((m) => ({ href: m.href, label: m.label })), ...RESOURCE_LINKS].map(
            (l) => (
              <Link key={l.href + l.label} href={l.href} className="mobile-nav-link" onClick={() => setMobileOpen(false)}>
                {l.label}
              </Link>
            )
          )}
        </div>
      )}
    </header>
  );
}
