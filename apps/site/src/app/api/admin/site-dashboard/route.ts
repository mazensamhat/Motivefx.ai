import { requireAdmin } from "@/lib/admin";
import { forbidden, json, serverError, unauthorized } from "@/lib/api";
import { getSiteAdminSnapshot } from "@/lib/site-admin-analytics";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) {
    if (auth.status === 401) return unauthorized(auth.error);
    return forbidden(auth.error);
  }

  try {
    return json(await getSiteAdminSnapshot());
  } catch (error) {
    console.error("[admin/site-dashboard]", error);
    return serverError("Could not load site dashboard.");
  }
}
