import { prisma } from "@motivefx/database";
import { runPersistentWatchAgents } from "@/lib/terminal/watch-agents";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
  const eventId = `watch-agents:${new Date().toISOString().slice(0, 13)}`;
  try {
    await prisma.opsTelemetryEvent.create({
      data: {
        eventId, eventName: "watch_agents_run", version: 1, product: "motivefx", environment: "production",
        observedAt: new Date(), status: "running", sourceClass: "scheduled_job", privacyClass: "internal_operational",
      },
    });
  } catch {
    const existing = await prisma.opsTelemetryEvent.findUnique({ where: { eventId } }).catch(() => null);
    if (existing?.status === "ok" || existing?.status === "running") return Response.json({ ok: true, duplicate: true, eventId });
  }
  try {
    const result = await runPersistentWatchAgents();
    await prisma.opsTelemetryEvent.update({ where: { eventId }, data: { status: "ok", metadataJson: JSON.stringify(result) } }).catch(() => undefined);
    return Response.json({ ok: true, eventId, ...result });
  } catch {
    await prisma.opsTelemetryEvent.update({ where: { eventId }, data: { status: "error", errorCode: "watch_agents_failed" } }).catch(() => undefined);
    return Response.json({ ok: false, error: "Watch Agents unavailable." }, { status: 503 });
  }
}
