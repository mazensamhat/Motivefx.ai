import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, CircleAlert, CircleHelp, Clock3 } from "lucide-react";
import { BrandLogo } from "@/components/brand/logo";
import { SiteFooter } from "@/components/marketing/site-footer";
import { StatusRefresh } from "@/components/status/status-refresh";
import { buildPublicStatusSnapshot, type PublicComponentStatus } from "@/lib/public-status";

export const metadata: Metadata = {
  title: "MotiveFX System Status",
  description: "Current availability and operating history for MotiveFX services.",
};

export const dynamic = "force-dynamic";

function label(status: PublicComponentStatus) {
  return status === "operational" ? "Operational"
    : status === "degraded" ? "Degraded"
    : status === "partial_outage" ? "Partial outage"
    : status === "major_outage" ? "Major outage"
    : "Checking";
}

function textClass(status: PublicComponentStatus) {
  return status === "operational" ? "text-emerald-300"
    : status === "degraded" ? "text-amber-300"
    : status === "partial_outage" ? "text-orange-300"
    : status === "major_outage" ? "text-rose-300"
    : "text-slate-300";
}

function dotClass(status: PublicComponentStatus) {
  return status === "operational" ? "bg-emerald-400"
    : status === "degraded" ? "bg-amber-400"
    : status === "partial_outage" ? "bg-orange-400"
    : status === "major_outage" ? "bg-rose-400"
    : "bg-slate-500";
}

function barClass(status: PublicComponentStatus | null) {
  if (!status) return "bg-white/[0.08]";
  return status === "operational" ? "bg-emerald-400/90"
    : status === "degraded" ? "bg-amber-400/90"
    : status === "partial_outage" ? "bg-orange-400/90"
    : status === "major_outage" ? "bg-rose-400/90"
    : "bg-slate-500/80";
}

function HistoryBars({ status, history }: { status: PublicComponentStatus; history: Array<PublicComponentStatus | null> }) {
  const recent = history.slice(-89);
  const slots: Array<PublicComponentStatus | null> = [
    ...Array.from({ length: Math.max(0, 89 - recent.length) }, () => null),
    ...recent,
  ];
  return (
    <div className="flex h-7 min-w-0 items-end gap-[2px]" aria-label={`Recent status history. Current status: ${label(status)}.`}>
      {slots.map((item, index) => <span key={index} className={`h-full min-w-0 flex-1 rounded-[2px] ${barClass(item)}`} aria-hidden />)}
      <span className={`h-full min-w-0 flex-1 rounded-[2px] ${barClass(status)}`} aria-hidden />
    </div>
  );
}

function overallCopy(status: PublicComponentStatus) {
  if (status === "operational") return { title: "All systems operational", body: "No confirmed customer-impacting issues are currently detected.", Icon: CheckCircle2, cls: "text-emerald-400", border: "border-emerald-300/20", glow: "from-emerald-400/10" };
  if (status === "degraded") return { title: "Some systems experiencing degraded performance", body: "At least one MotiveFX service has a confirmed performance issue.", Icon: AlertTriangle, cls: "text-amber-400", border: "border-amber-300/25", glow: "from-amber-400/10" };
  if (status === "partial_outage") return { title: "Partial service outage", body: "A confirmed issue is affecting part of MotiveFX.", Icon: CircleAlert, cls: "text-orange-400", border: "border-orange-300/25", glow: "from-orange-400/10" };
  if (status === "major_outage") return { title: "Major service disruption", body: "A confirmed issue is significantly affecting one or more MotiveFX services.", Icon: CircleAlert, cls: "text-rose-400", border: "border-rose-300/25", glow: "from-rose-400/10" };
  return { title: "Status verification in progress", body: "One or more MotiveFX service checks are waiting for fresh audit evidence.", Icon: CircleHelp, cls: "text-slate-300", border: "border-slate-300/20", glow: "from-slate-400/10" };
}

function formatted(iso: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Toronto",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(new Date(iso));
}

export default async function StatusPage() {
  const snapshot = await buildPublicStatusSnapshot();
  const overall = overallCopy(snapshot.overall);
  const Icon = overall.Icon;

  return (
    <div className="min-h-screen bg-[#070B14] text-[#F7F9FC]">
      <header className="border-b border-white/10 bg-[#070B14]/95">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <BrandLogo />
          <div className="flex items-center gap-4 text-sm">
            <Link href="/data-sources" className="text-slate-400 hover:text-white">Data sources</Link>
            <Link href="/" className="text-emerald-300 hover:text-white">MotiveFX.AI</Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-12 sm:py-16">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-xs font-semibold text-emerald-200">LIVE SYSTEM STATUS</span>
          <StatusRefresh />
        </div>

        <section className={`rounded-[28px] border bg-gradient-to-br ${overall.border} ${overall.glow} via-[#0D1420] to-[#0D1420] p-6 sm:p-8`}>
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <Icon className={`h-8 w-8 ${overall.cls}`} aria-hidden />
                <h1 className="font-[var(--font-space)] text-3xl font-semibold sm:text-4xl">{overall.title}</h1>
              </div>
              <p className="mt-3 max-w-2xl text-slate-400">{overall.body}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm">
              <p className="text-slate-500">Last checked</p>
              <time className="mt-1 block font-medium text-white" dateTime={snapshot.checkedAt}>{formatted(snapshot.checkedAt)}</time>
              <p className="mt-1 text-xs text-slate-500">Auto-refreshes every 60 seconds</p>
            </div>
          </div>
        </section>

        <section className="mt-10">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Monitored services</p>
              <h2 className="mt-1 text-xl font-semibold">Current status</h2>
            </div>
            <span className="text-xs text-slate-500">{snapshot.historyAvailable ? "90-day status history" : "History collection in progress"}</span>
          </div>

          <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#0D1420]">
            {snapshot.components.map((component, index) => (
              <div key={component.id} className={`grid gap-3 px-5 py-4 sm:grid-cols-[230px_minmax(0,1fr)_130px] sm:items-center ${index ? "border-t border-white/[0.07]" : ""}`}>
                <div className="min-w-0">
                  <div className="font-medium text-white">{component.label}</div>
                  <div className="mt-1 text-xs leading-5 text-slate-500">{component.detail}</div>
                </div>
                <HistoryBars status={component.status} history={component.history} />
                <div className={`flex items-center gap-2 text-sm font-medium sm:justify-end ${textClass(component.status)}`}>
                  <span className={`h-2 w-2 rounded-full ${dotClass(component.status)}`} />
                  {label(component.status)}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span className="h-3 w-3 rounded-[2px] bg-white/[0.08]" /> No historical measurement yet
            <span className="ml-2 h-3 w-3 rounded-[2px] bg-emerald-400/90" /> Operational
          </div>
        </section>

        <section className="mt-10 rounded-3xl border border-white/10 bg-[#0D1420] p-6">
          <div className="flex items-center gap-2 text-emerald-300">
            <Clock3 className="h-5 w-5" aria-hidden />
            <p className="text-xs font-semibold uppercase tracking-[0.18em]">Active incidents</p>
          </div>
          {snapshot.activeIssues.length === 0 ? (
            <>
              <h2 className="mt-3 text-xl font-semibold">No active incidents</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">No current MotiveFX incident is confirmed by the latest production checks.</p>
            </>
          ) : (
            <>
              <h2 className="mt-3 text-xl font-semibold">{snapshot.activeIssues.length} affected service{snapshot.activeIssues.length === 1 ? "" : "s"}</h2>
              <ul className="mt-4 space-y-2">
                {snapshot.activeIssues.map((issue) => (
                  <li key={issue.componentId} className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm">
                    <span className="font-medium text-white">{issue.componentLabel}</span>
                    <span className={`ml-2 ${textClass(issue.status)}`}>{label(issue.status)}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
          <p className="mt-5 text-xs leading-5 text-slate-500">
            Status is driven by MotiveFX production checks and incident evidence. Missing telemetry is shown as Checking rather than silently reported as healthy.
          </p>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
