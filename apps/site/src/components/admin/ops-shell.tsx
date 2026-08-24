"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, ExternalLink, LogOut } from "lucide-react";
import { OPS_NAV, OPS_QUICK_LINKS } from "@/components/admin/ops-nav";
import { clientLogout } from "@/lib/auth-client";
import { displayNameFromEmail, initialsFromEmail } from "@/lib/ops-display-name";

export function OpsShell({
  adminEmail,
  children,
}: {
  adminEmail: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const displayName = displayNameFromEmail(adminEmail);
  const initials = initialsFromEmail(adminEmail);

  return (
    <div className="ops-layout">
      <aside className="ops-sidebar">
        <div className="ops-sidebar-brand">
          <Image
            src="/brand/motivefx-logo.png"
            alt="MotiveFX"
            width={36}
            height={36}
            className="ops-brand-mark"
          />
          <div>
            <p className="ops-brand-name">MOTIVEFX</p>
            <p className="ops-brand-sub">Ops Console</p>
          </div>
        </div>

        <div className="ops-profile-card">
          <span className="ops-profile-avatar">{initials}</span>
          <div className="ops-profile-meta">
            <strong>{displayName}</strong>
            <span>{adminEmail}</span>
          </div>
          <ChevronDown className="ops-profile-chevron" aria-hidden />
        </div>

        <nav className="ops-nav" aria-label="Ops navigation">
          {OPS_NAV.map((item) => {
            const Icon = item.icon;
            const active = !item.external && pathname === item.href;
            const className = `ops-nav-link${active ? " active" : ""}`;

            if (item.external) {
              return (
                <a
                  key={item.id}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={className}
                  title={item.description}
                >
                  <Icon className="ops-nav-icon" />
                  <span>{item.label}</span>
                  {item.badge ? <span className="ops-nav-badge new">{item.badge}</span> : null}
                  <ExternalLink className="ops-nav-external" />
                </a>
              );
            }

            return (
              <Link key={item.id} href={item.href} className={className} title={item.description}>
                <Icon className="ops-nav-icon" />
                <span>{item.label}</span>
                {item.badge ? <span className="ops-nav-badge new">{item.badge}</span> : null}
              </Link>
            );
          })}
        </nav>

        <div className="ops-quick-links">
          <p className="ops-quick-label">Quick Links</p>
          {OPS_QUICK_LINKS.map((item) => {
            const Icon = item.icon;
            const active = !item.external && pathname === item.href;
            const className = `ops-nav-link secondary${active ? " active" : ""}`;

            if (item.external) {
              return (
                <a
                  key={item.id}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={className}
                >
                  <Icon className="ops-nav-icon" />
                  <span>{item.label}</span>
                  <ExternalLink className="ops-nav-external" />
                </a>
              );
            }

            return (
              <Link key={item.id} href={item.href} className={className}>
                <Icon className="ops-nav-icon" />
                <span>{item.label}</span>
              </Link>
            );
          })}
          <button type="button" className="ops-nav-link secondary" onClick={() => clientLogout()}>
            <LogOut className="ops-nav-icon" />
            <span>Sign out</span>
          </button>
        </div>

        <footer className="ops-sidebar-status">
          <span className="ops-status-pulse" aria-hidden />
          All systems operational · Last checked 1m ago
        </footer>
      </aside>

      <div className="ops-main">
        <main className="ops-content">{children}</main>
      </div>
    </div>
  );
}
