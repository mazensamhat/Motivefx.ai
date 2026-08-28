import { requireAdmin } from "@/lib/admin";
import { forbidden, json, serverError, unauthorized } from "@/lib/api";
import { buildCommandAttention } from "@/lib/ops/attention";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) {
    if (auth.status === 401) return unauthorized(auth.error);
    return forbidden(auth.error);
  }

  try {
    return json(await buildCommandAttention());
  } catch (error) {
    console.error("[admin/command]", error);
    return serverError("Could not load command attention.");
  }
}
