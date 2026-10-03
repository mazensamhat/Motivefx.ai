import { buildCalibrationFromOutcomes } from "@/lib/ops/outcomes";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!authorized(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const calibration = await buildCalibrationFromOutcomes();
  return Response.json({ ok: true, generatedAt: new Date().toISOString(), calibration }, {
    headers: { "Cache-Control": "no-store" },
  });
}
