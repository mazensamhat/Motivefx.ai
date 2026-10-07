import { prisma } from "@motivefx/database";

export const metadata = {
  title: "Client Errors — MotiveFX Ops",
  robots: { index: false, follow: false },
};

type ErrorGroup = {
  platform: string;
  surface: string;
  route: string;
  error_name: string;
  message_signature: string;
  app_version: string | null;
  occurrences: number;
  first_seen: Date;
  last_seen: Date;
};

function stamp(value: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Toronto",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

function filterHref(days: number, platform: string) {
  const params = new URLSearchParams();
  params.set("days", String(days));
  if (platform !== "all") params.set("platform", platform);
  return `?${params.toString()}`;
}

export default async function ClientErrorsPage({
  searchParams,
}: {
  searchParams?: Promise<{ days?: string; platform?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const allowedDays = [1, 7, 30];
  const requestedDays = Number(params.days ?? 7);
  const days = allowedDays.includes(requestedDays) ? requestedDays : 7;
  const platforms = ["all", "web", "ios", "android", "native", "unknown"];
  const platform = platforms.includes(params.platform ?? "") ? params.platform! : "all";
  const since = new Date(Date.now() - days * 86_400_000);

  let rows: ErrorGroup[] = [];
  try {
    rows = await prisma.$queryRawUnsafe<ErrorGroup[]>(
      `SELECT
         COALESCE(platform, 'unknown') AS platform,
         COALESCE("metadataJson"::jsonb->>'surface', 'unknown') AS surface,
         COALESCE("metadataJson"::jsonb->>'route', '/') AS route,
         COALESCE("metadataJson"::jsonb->>'errorName', 'Error') AS error_name,
         COALESCE("metadataJson"::jsonb->>'messageSignature', 'unknown') AS message_signature,
         "appVersion" AS app_version,
         COUNT(*)::int AS occurrences,
         MIN("observedAt") AS first_seen,
         MAX("observedAt") AS last_seen
       FROM public."OpsTelemetryEvent"
       WHERE "eventName" = 'client.error'
         AND "observedAt" >= $1
         AND ($2 = 'all' OR COALESCE(platform, 'unknown') = $2)
       GROUP BY 1,2,3,4,5,6
       ORDER BY occurrences DESC, last_seen DESC
       LIMIT 200`,
      since,
      platform
    );
  } catch (error) {
    console.error("[admin/client-errors]", error);
  }

  const total = rows.reduce((sum, row) => sum + Number(row.occurrences || 0), 0);
  const latest = rows.reduce<Date | null>(
    (value, row) => (!value || row.last_seen > value ? row.last_seen : value),
    null
  );

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
          Platform
        </p>
        <h1 className="text-2xl font-semibold">Client Errors</h1>
        <p className="mt-1 text-sm text-slate-500">
          Privacy-minimized web, iOS and Android runtime/network failures grouped by anonymous signature.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border bg-white p-4">
          <p className="text-xs uppercase tracking-wider text-slate-500">Events</p>
          <p className="mt-1 text-2xl font-semibold">{total}</p>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <p className="text-xs uppercase tracking-wider text-slate-500">Error groups</p>
          <p className="mt-1 text-2xl font-semibold">{rows.length}</p>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <p className="text-xs uppercase tracking-wider text-slate-500">Latest</p>
          <p className="mt-1 text-sm font-semibold">{latest ? stamp(latest) : "No errors"}</p>
        </div>
      </div>

      <div className="space-y-3 rounded-xl border bg-slate-50 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Window
          </span>
          {allowedDays.map((value) => (
            <a
              key={value}
              href={filterHref(value, platform)}
              className={`rounded-lg border px-3 py-2 text-sm font-medium ${
                days === value ? "bg-slate-900 text-white" : "bg-white"
              }`}
            >
              {value}d
            </a>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Platform
          </span>
          {platforms.map((value) => (
            <a
              key={value}
              href={filterHref(days, value)}
              className={`rounded-lg border px-3 py-2 text-sm font-medium ${
                platform === value ? "bg-slate-900 text-white" : "bg-white"
              }`}
            >
              {value === "all" ? "All" : value}
            </a>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3">Count</th>
              <th className="px-4 py-3">Platform</th>
              <th className="px-4 py-3">Surface</th>
              <th className="px-4 py-3">Route</th>
              <th className="px-4 py-3">Error</th>
              <th className="px-4 py-3">Signature</th>
              <th className="px-4 py-3">App</th>
              <th className="px-4 py-3">First / Last</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((row) => (
              <tr
                key={[
                  row.platform,
                  row.surface,
                  row.route,
                  row.error_name,
                  row.message_signature,
                  row.app_version ?? "",
                ].join("|")}
              >
                <td className="px-4 py-3 font-semibold">{row.occurrences}</td>
                <td className="px-4 py-3">{row.platform}</td>
                <td className="px-4 py-3">{row.surface}</td>
                <td className="px-4 py-3 font-mono text-xs">{row.route}</td>
                <td className="px-4 py-3">{row.error_name}</td>
                <td className="px-4 py-3 font-mono text-xs">{row.message_signature}</td>
                <td className="px-4 py-3">{row.app_version ?? "—"}</td>
                <td className="px-4 py-3 text-xs text-slate-500">
                  {stamp(row.first_seen)}
                  <br />
                  {stamp(row.last_seen)}
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td className="px-4 py-8 text-center text-slate-500" colSpan={8}>
                  No client errors captured for this filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
