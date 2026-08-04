import { getSession } from "@/lib/session";
import { badRequest, json, unauthorized } from "@/lib/api";
import { normalizeUsageModule, recordUsageEvent } from "@/lib/usage-events";
import { z } from "zod";

export const dynamic = "force-dynamic";

const schema = z.object({
  moduleId: z.string().min(1).max(32),
  action: z.string().min(1).max(64).optional(),
});

/**
 * Client-side module open tracker (terminal tabs).
 * Mirrors MyMotiveLife `/api/module-usage` so Ops heatmaps / utilization populate.
 */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return unauthorized();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON");
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) return badRequest("Invalid module");

  const moduleId = normalizeUsageModule(parsed.data.moduleId);
  if (!moduleId) return badRequest("Unknown module");

  // Do not await write completion for snappy UX; still return after create.
  await recordUsageEvent(session.id, moduleId, parsed.data.action ?? "open");

  return json({ ok: true, module: moduleId });
}
