import Link from "next/link";
import type { OpsNavItem } from "@/components/admin/ops-nav";

export function OpsStubPage({ item }: { item: OpsNavItem }) {
  const Icon = item.icon;
  return (
    <section className="ops-page">
      <header className="ops-page-header">
        <div className="ops-page-icon">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h2>{item.label}</h2>
          <p>{item.description ?? "Coming in a future sprint."}</p>
        </div>
      </header>
      <div className="ops-stub-card app-panel">
        <p className="text-sm text-slate-400">
          This section is planned in the{" "}
          <Link href="/admin/overview" className="ops-inline-link">
            MotiveFX Ops master plan
          </Link>
          . Sprint 1 ships Overview, Market Truth, and Providers. Full content for{" "}
          <strong className="text-white">{item.label}</strong> lands in upcoming sprints — reuse
          existing admin components where possible.
        </p>
        {item.external ? (
          <a
            href={item.href}
            target="_blank"
            rel="noopener noreferrer"
            className="admin-btn admin-btn-primary mt-4 inline-flex"
          >
            Open {item.label} (external)
          </a>
        ) : (
          <Link href="/admin/legacy" className="admin-btn mt-4 inline-flex">
            View related data in classic dashboard →
          </Link>
        )}
      </div>
    </section>
  );
}
