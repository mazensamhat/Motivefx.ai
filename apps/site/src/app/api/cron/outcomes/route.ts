import { prisma } from "@motivefx/database";
import { evaluatePendingOutcomes } from "@/lib/ops/outcomes";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function hourKey() {
  const d = new Date();
  return d.toISOString().slice(0, 13);
}

export async function GET() {
  const eventId = `outcome-evaluator:${hourKey()}`;
  try {
    await prisma.opsTelemetryEvent.create({
      data: {
        eventId, eventName: "outcome_evaluator_run", version: 1, product: "motivefx",
        environment: "production", observedAt: new Date(), status: "running",
        sourceClass: "scheduled_job", privacyClass: "internal_operational",
      },
    });
  } catch {
    const existing = await prisma.opsTelemetryEvent.findUnique({ where: { eventId } }).catch(() => null);
    if (existing?.status === "ok" || existing?.status === "running") {
      return Response.json({ ok: true, duplicate: true, eventId });
    }
  }
  try {
    const result = await evaluatePendingOutcomes(2000);
    await prisma.opsTelemetryEvent.update({
      where: { eventId },
      data: { status: "ok", metadataJson: JSON.stringify(result) },
    }).catch(() => undefined);
    return Response.json({ ok: true, eventId, ...result });
  } catch {
    await prisma.opsTelemetryEvent.update({
      where: { eventId }, data: { status: "error", errorCode: "outcome_evaluator_failed" },
    }).catch(() => undefined);
    return Response.json({ ok: false, error: "Outcome evaluation unavailable." }, { status: 503 });
  }
}
