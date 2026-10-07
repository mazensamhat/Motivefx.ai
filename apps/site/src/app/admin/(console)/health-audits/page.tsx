import { prisma } from "@motivefx/database";

export const metadata = {
  title: "Health & Security — MotiveFX Ops",
  robots: { index: false, follow: false },
};

type AuditEntry = {
  check?: string;
  title?: string;
  finding?: string;
  diagnosis?: string;
  fixedState?: "pass" | "partial" | "unknown" | "fail";
  remediationPerformed?: string;
  resolution?: string;
  verificationEvidence?: string;
  evidence?: string;
  fixed?: boolean;
  affectedSurface?: string;
};

type StructuredDetails = {
  scope?: string;
  checks?: AuditEntry[];
  findings?: AuditEntry[];
  checkedWindow?: {
    periodStart?: string;
    periodEnd?: string;
    checkedAt?: string;
  };
};

type Run = {
  id: string;
  cadence: string;
  period_start: string;
  period_end: string;
  checked_at: string;
  status: string;
  issue_count: number;
  open_count: number;
  fixed_count: number;
  summary: string;
  details: AuditEntry[] | StructuredDetails | null;
  deployment_id: string | null;
  deployment_state: string | null;
};

async function runs(): Promise<Run[]> {
  try {
    const rows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT id,cadence,period_start,period_end,checked_at,status,issue_count,open_count,fixed_count,summary,details,deployment_id,deployment_state
       FROM public."OpsProductionWatchRun"
       WHERE product_key='motivefx'
       ORDER BY checked_at DESC
       LIMIT 250`
    );
    return rows as Run[];
  } catch (error) {
    console.error("[health-audits]", error);
    return [];
  }
}

const stamp = (value: string) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Toronto",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));

function auditEntries(run: Run): AuditEntry[] {
  if (Array.isArray(run.details)) return run.details;
  if (run.details && Array.isArray(run.details.checks)) return run.details.checks;
  return [];
}

function verificationLabel(entry: AuditEntry) {
  if (entry.fixedState === "pass" || entry.fixed === true) return "PASS";
  if (entry.fixedState === "fail" || entry.fixed === false) return "FAILED / OPEN";
  if (entry.fixedState === "partial") return "PARTIAL";
  return "MONITORING / UNKNOWN";
}

export default async function HealthAuditsPage() {
  const all = await runs();
  const cadences = ["hourly", "daily", "weekly", "monthly"];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Platform</p>
        <h1 className="text-2xl font-semibold">Production Health & Security</h1>
        <p className="mt-1 text-sm text-slate-500">
          Automated MotiveFX checks, findings, remediation and pass/fail verification.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {cadences.map((cadence) => (
          <a
            key={cadence}
            href={"#" + cadence}
            className="rounded-lg border px-3 py-2 text-sm font-medium"
          >
            {cadence[0].toUpperCase() + cadence.slice(1)} (
            {all.filter((run) => run.cadence === cadence).length})
          </a>
        ))}
      </div>

      {cadences.map((cadence) => (
        <section
          id={cadence}
          key={cadence}
          className="overflow-hidden rounded-xl border bg-white"
        >
          <div className="border-b px-5 py-4">
            <h2 className="font-semibold">
              {cadence[0].toUpperCase() + cadence.slice(1)} checks
            </h2>
          </div>

          <div className="divide-y">
            {all
              .filter((run) => run.cadence === cadence)
              .map((run) => {
                const entries = auditEntries(run);
                return (
                  <details key={run.id} className="px-5 py-4">
                    <summary className="cursor-pointer">
                      <div className="grid gap-2 md:grid-cols-[170px_100px_90px_90px_90px_1fr]">
                        <span>{stamp(run.period_end)}</span>
                        <strong>{run.status}</strong>
                        <span>{run.issue_count} issues</span>
                        <span>{run.open_count} open</span>
                        <span>{run.fixed_count} fixed</span>
                        <span>{run.summary}</span>
                      </div>
                    </summary>

                    <div className="mt-4 space-y-3 bg-slate-50 p-4">
                      <div className="text-xs text-slate-500">
                        Checked {stamp(run.checked_at)}
                        {run.deployment_id ? ` · Deployment ${run.deployment_id}` : ""}
                        {run.deployment_state ? ` · ${run.deployment_state}` : ""}
                      </div>

                      {entries.length ? (
                        entries.map((entry, index) => (
                          <div key={index} className="rounded-lg border bg-white p-3">
                            <strong>{entry.check || entry.title || "Check"}</strong>
                            {entry.affectedSurface ? (
                              <p className="text-xs text-slate-500">
                                Surface: {entry.affectedSurface}
                              </p>
                            ) : null}
                            <p className="mt-1 text-sm">
                              Finding: {entry.finding || "No issue recorded."}
                            </p>
                            <p className="text-sm">
                              Diagnosis: {entry.diagnosis || "—"}
                            </p>
                            <p className="text-sm">
                              Fix/action:{" "}
                              {entry.remediationPerformed ||
                                entry.resolution ||
                                "No action required"}
                            </p>
                            <p className="text-sm">
                              Verification:{" "}
                              {entry.verificationEvidence || entry.evidence || "—"}
                            </p>
                            <p className="mt-1 text-sm font-semibold">
                              {verificationLabel(entry)}
                            </p>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm">No check details were recorded for this run.</p>
                      )}
                    </div>
                  </details>
                );
              })}

            {!all.some((run) => run.cadence === cadence) && (
              <p className="px-5 py-6 text-sm text-slate-500">
                No recorded {cadence} run yet.
              </p>
            )}
          </div>
        </section>
      ))}
    </div>
  );
}
