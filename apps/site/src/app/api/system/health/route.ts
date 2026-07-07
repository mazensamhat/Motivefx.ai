import { json } from "@/lib/api";
import { getBackendApiUrl } from "@/lib/backend";
import { isDatabaseConfigured } from "@/lib/db-check";

export const dynamic = "force-dynamic";

export async function GET() {
  const checks = {
    authSecret: Boolean(process.env.AUTH_SECRET?.trim()),
    database: isDatabaseConfigured(),
    backendUrl: Boolean(process.env.MOTIVEFX_API_URL?.trim()),
    backendSyncSecret: Boolean(process.env.BACKEND_SYNC_SECRET?.trim()),
    backend: false,
  };

  let backendDetail: Record<string, unknown> | null = null;
  try {
    const res = await fetch(`${getBackendApiUrl()}/api/health`, { cache: "no-store" });
    checks.backend = res.ok;
    if (res.ok) backendDetail = (await res.json()) as Record<string, unknown>;
  } catch {
    checks.backend = false;
  }

  const ok =
    checks.authSecret &&
    checks.database &&
    checks.backendSyncSecret &&
    checks.backend;

  return json(
    {
      ok,
      checks,
      backend: backendDetail,
      hint: ok
        ? null
        : "Set AUTH_SECRET, DATABASE_URL, BACKEND_SYNC_SECRET, MOTIVEFX_API_URL and run FastAPI.",
    },
    ok ? 200 : 503
  );
}
