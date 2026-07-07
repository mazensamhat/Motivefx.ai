import { requireAdmin } from "@/lib/admin";
import { forbidden, json, serverError, unauthorized } from "@/lib/api";
import { getPlatformMonitorSnapshot } from "@/lib/platform-monitor";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) {
    if (auth.status === 401) return unauthorized(auth.error);
    return forbidden(auth.error);
  }

  try {
    return json(await getPlatformMonitorSnapshot());
  } catch (error) {
    console.error("[admin/platforms]", error);
    return serverError("Could not load platform monitor.");
  }
}
