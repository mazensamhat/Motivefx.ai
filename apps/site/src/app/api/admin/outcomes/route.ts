import { requireAdmin } from "@/lib/admin";
import { forbidden, json, serverError, unauthorized } from "@/lib/api";
import { buildCalibrationFromOutcomes, evaluatePendingOutcomes } from "@/lib/ops/outcomes";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) {
    if (auth.status === 401) return unauthorized(auth.error);
    return forbidden(auth.error);
  }

  try {
    const calibration = await buildCalibrationFromOutcomes();
    return json({ generatedAt: new Date().toISOString(), calibration });
  } catch (error) {
    console.error("[admin/outcomes]", error);
    return serverError("Could not load outcomes");
  }
}

export async function POST() {
  const auth = await requireAdmin();
  if (!auth.ok) {
    if (auth.status === 401) return unauthorized(auth.error);
    return forbidden(auth.error);
  }

  try {
    const result = await evaluatePendingOutcomes(100);
    const calibration = await buildCalibrationFromOutcomes();
    return json({ ok: true, ...result, calibration });
  } catch (error) {
    console.error("[admin/outcomes POST]", error);
    return serverError("Could not evaluate outcomes");
  }
}
