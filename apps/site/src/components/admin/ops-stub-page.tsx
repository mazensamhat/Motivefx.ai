"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";

export function OpsStubPage({
  title,
  description,
  icon: Icon,
  phase = "P1",
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  phase?: string;
}) {
  return (
    <section className="ops-page">
      <header className="ops-page-header">
        <div className="ops-page-icon">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
      </header>
      <div className="ops-card">
        <p className="ops-muted" style={{ marginBottom: "0.75rem" }}>
          Scheduled for <strong>{phase}</strong> in the MotiveFX Ops Master Plan v1.0. The foundation
          (registries, telemetry, truth states, RBAC, audit) is already in place.
        </p>
        <Link href="/admin/overview" className="ops-toolbar-btn">
          Back to Command Center
        </Link>
      </div>
    </section>
  );
}
