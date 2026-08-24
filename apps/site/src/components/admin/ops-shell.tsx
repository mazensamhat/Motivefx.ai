"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ExternalLink,
  LayoutDashboard,
  LogOut,
  RefreshCw,
} from "lucide-react";
import { OPS_NAV, OPS_SECONDARY_NAV } from "@/components/admin/ops-nav";
import { clientLogout } from "@/lib/auth-client";
import { MOTIVEPULSE_OPS_URL } from "@/lib/ops-links";

export function OpsShell({
  adminEmail,
  children,
}: {
  adminEmail: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="ops-layout">
      <aside className="ops-sidebar app-panel">
        <div className="ops-sidebar-brand">
          <p className="ops-sidebar-eyebrow">MotiveFX</p>
          <h1 className="ops-sidebar-title">Ops Console</h1>
          <p className="ops-sidebar-sub">{adminEmail}</p>
        </div>

        <nav className="ops-nav" aria-label="Ops navigation">
          {OPS_NAV.map((item) => {
            const Icon = item.icon;
            const active = !item.external && pathname === item.href;
            const className = `ops-nav-link${active ? " active" : ""}${item.stub ? " stub" : ""}`;

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
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                  <ExternalLink className="ops-nav-external h-3 w-3" />
                </a>
              );
            }

            return (
              <Link key={item.id} href={item.href} className={className} title={item.description}>
                <Icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
                {item.stub ? <span className="ops-nav-badge">Soon</span> : null}
              </Link>
            );
          })}
        </nav>

        <div className="ops-sidebar-footer">
          {OPS_SECONDARY_NAV.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.id}
                href={item.href}
                className={`ops-nav-link secondary${active ? " active" : ""}`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
          <a
            href={MOTIVEPULSE_OPS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="ops-nav-link secondary"
          >
            <ExternalLink className="h-4 w-4 shrink-0" />
            <span>MotivePulse Ops</span>
          </a>
          <button type="button" className="ops-nav-link secondary" onClick={() => clientLogout()}>
            <LogOut className="h-4 w-4 shrink-0" />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      <div className="ops-main">
        <header className="ops-topbar app-panel">
          <div>
            <p className="ops-topbar-eyebrow">Platform intelligence</p>
            <p className="ops-topbar-meta">
              Bloomberg discipline · Stripe clarity ·{" "}
              <Link href="/admin/legacy" className="ops-inline-link">
                classic view
              </Link>
            </p>
          </div>
          <div className="ops-topbar-actions">
            <Link href="/app" className="admin-btn">
              <LayoutDashboard className="h-3.5 w-3.5" /> Terminal
            </Link>
            <button
              type="button"
              className="admin-btn"
              onClick={() => window.location.reload()}
            >
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </button>
          </div>
        </header>
        <main className="ops-content">{children}</main>
      </div>
    </div>
  );
}
