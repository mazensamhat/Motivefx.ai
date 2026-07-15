import { json } from "@/lib/api";
import { isDatabaseConfigured } from "@/lib/db-check";
import { checkAppleIapSchema } from "@/lib/load-user";

export const dynamic = "force-dynamic";

export async function GET() {
  const checks = {
    authSecret: Boolean(process.env.AUTH_SECRET?.trim()),
    database: isDatabaseConfigured(),
    userSchema: false as boolean,
    stripe: Boolean(process.env.STRIPE_SECRET_KEY?.trim()),
    api: false,
  };

  let schemaMissing: string[] = [];
  if (checks.database) {
    const schema = await checkAppleIapSchema();
    checks.userSchema = schema.ok;
    schemaMissing = schema.missing;
  }

  let apiDetail: Record<string, unknown> | null = null;
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://127.0.0.1:3010";
    const res = await fetch(`${appUrl}/api/health`, { cache: "no-store" });
    checks.api = res.ok;
    if (res.ok) apiDetail = (await res.json()) as Record<string, unknown>;
  } catch {
    checks.api = false;
  }

  const ok = checks.authSecret && checks.database && checks.userSchema && checks.api;

  return json(
    {
      ok,
      checks,
      schemaMissing: schemaMissing.length ? schemaMissing : null,
      api: apiDetail,
      hint: ok
        ? null
        : !checks.userSchema
          ? "User schema drift: run `pnpm --filter @motivefx/database exec prisma db push` (Apple IAP columns missing)."
          : "Set AUTH_SECRET, DATABASE_URL, and verify /api/health responds.",
    },
    ok ? 200 : 503
  );
}
