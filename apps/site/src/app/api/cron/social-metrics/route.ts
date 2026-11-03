import { syncSocialProviders } from "@/lib/ops/social-provider-sync";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await syncSocialProviders();
  const ok = result.synced > 0 && result.results.every(row => row.status === "synced" || row.status === "unsupported");
  return Response.json({ ok, ...result }, { status: ok ? 200 : 503, headers: { "Cache-Control": "no-store" } });
}
