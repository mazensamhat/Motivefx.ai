import { requireAdmin } from "@/lib/admin";
import { badRequest, forbidden, json, serverError, unauthorized } from "@/lib/api";
import { enqueueReplayJob, listReplayJobs, REPLAY_PERIODS } from "@/lib/ops/replay";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) {
    if (auth.status === 401) return unauthorized(auth.error);
    return forbidden(auth.error);
  }

  try {
    const jobs = await listReplayJobs(30);
    return json({
      generatedAt: new Date().toISOString(),
      periods: REPLAY_PERIODS,
      jobs: jobs.map((j) => ({
        id: j.id,
        periodKey: j.periodKey,
        periodLabel: j.periodLabel,
        status: j.status,
        asOfTimestamp: j.asOfTimestamp.toISOString(),
        signalsEvaluated: j.signalsEvaluated,
        directionAccuracy: j.directionAccuracy,
        result: j.resultJson ? JSON.parse(j.resultJson) : null,
        error: j.error,
        createdBy: j.createdBy,
        createdAt: j.createdAt.toISOString(),
        completedAt: j.completedAt?.toISOString() ?? null,
      })),
    });
  } catch (error) {
    console.error("[admin/replay]", error);
    return serverError("Could not load replay jobs");
  }
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    if (auth.status === 401) return unauthorized(auth.error);
    return forbidden(auth.error);
  }

  try {
    const body = (await request.json()) as { periodKey?: string };
    if (!body.periodKey) return badRequest("periodKey required");
    const result = await enqueueReplayJob({
      periodKey: body.periodKey,
      actorId: auth.session.id,
      actorEmail: auth.session.email,
    });
    if ("error" in result) return badRequest(result.error);
    return json({ ok: true, job: result });
  } catch (error) {
    console.error("[admin/replay POST]", error);
    return serverError("Could not enqueue replay");
  }
}
