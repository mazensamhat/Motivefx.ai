"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, LogOut, Settings } from "lucide-react";
import { BrandLogo } from "@/components/brand/logo";
import { clientLogout } from "@/lib/auth-client";

const NAV = [
  { href: "/app", label: "Terminal", icon: LayoutDashboard },
  { href: "/app/settings", label: "Account", icon: Settings },
] as const;

export function AppShell({
  email,
  children,
}: {
  email: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="app-layout min-h-screen">
      <header className="app-header">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <BrandLogo href="/app" />
          <nav className="hidden items-center gap-1 sm:flex">
            {NAV.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href || (item.href !== "/app" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`app-header-link ${active ? "app-header-link-active" : ""}`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center gap-2">
            <span className="hidden text-sm text-slate-400 md:inline">{email}</span>
            <button type="button" className="app-header-link" onClick={() => clientLogout()}>
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
    </div>
  );
}
