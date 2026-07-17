import { requireAdmin } from "@/lib/admin";
import { forbidden, json, serverError, unauthorized } from "@/lib/api";
import { getFinancialSnapshot } from "@/lib/admin-financial-analytics";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) {
    if (auth.status === 401) return unauthorized(auth.error);
    return forbidden(auth.error);
  }

  try {
    return json(await getFinancialSnapshot());
  } catch (error) {
    console.error("[admin/financial]", error);
    return serverError("Could not load financial metrics.");
  }
}
