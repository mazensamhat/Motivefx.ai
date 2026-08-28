"use client";

import Link from "next/link";
import { RefreshCw, Search, Terminal } from "lucide-react";
import { OpsNotificationsBell } from "@/components/admin/ops-notifications-bell";
import { initialsFromEmail } from "@/lib/ops-display-name";

export function OpsPageToolbar({ adminEmail }: { adminEmail?: string }) {
  const initials = adminEmail ? initialsFromEmail(adminEmail) : "OP";

  return (
    <div className="ops-toolbar-actions">
      <button
        type="button"
        className="ops-toolbar-btn"
        onClick={() => window.dispatchEvent(new Event("ops:open-palette"))}
        title="Search (Ctrl/⌘+K)"
      >
        <Search className="h-4 w-4" /> Search
      </button>
      <label className="ops-date-picker">
        <input type="date" defaultValue={new Date().toISOString().slice(0, 10)} />
      </label>
      <Link href="/app" className="ops-toolbar-btn">
        <Terminal className="h-4 w-4" /> Terminal
      </Link>
      <button type="button" className="ops-toolbar-btn" onClick={() => window.location.reload()}>
        <RefreshCw className="h-4 w-4" /> Refresh
      </button>
      <OpsNotificationsBell />
      <span className="ops-toolbar-avatar">{initials}</span>
    </div>
  );
}
