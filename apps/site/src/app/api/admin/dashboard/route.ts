import { requireAdmin } from "@/lib/admin";
import { forbidden, json, serverError, unauthorized } from "@/lib/api";
import { getAdminDashboard } from "@/lib/terminal-admin-analytics";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) {
    if (auth.status === 401) return unauthorized(auth.error);
    return forbidden(auth.error);
  }

  try {
    return json(await getAdminDashboard());
  } catch (error) {
    console.error("[admin/dashboard]", error);
    return serverError("Could not load dashboard.");
  }
}
