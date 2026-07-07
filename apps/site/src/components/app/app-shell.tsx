"use client";

import Link from "next/link";
import { LogOut, Settings } from "lucide-react";
import { BrandLogo } from "@/components/brand/logo";
import { clientLogout } from "@/lib/auth-client";

export function AppShell({
  email,
  children,
}: {
  email: string;
  children: React.ReactNode;
}) {
  return (
    <div className="app-layout min-h-screen">
      <header className="app-header">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <BrandLogo href="/app" />
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-slate-400 sm:inline">{email}</span>
            <Link href="/pricing" className="app-header-link">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Billing</span>
            </Link>
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
