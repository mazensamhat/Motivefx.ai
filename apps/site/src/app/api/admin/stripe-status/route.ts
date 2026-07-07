import { requireAdmin } from "@/lib/admin";
import { forbidden, json, serverError, unauthorized } from "@/lib/api";
import { getStripeStatusForAdmin } from "@/lib/platform-monitor";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) {
    if (auth.status === 401) return unauthorized(auth.error);
    return forbidden(auth.error);
  }

  try {
    return json(await getStripeStatusForAdmin());
  } catch (error) {
    console.error("[admin/stripe-status]", error);
    return serverError("Could not check Stripe status.");
  }
}
