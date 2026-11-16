import { prisma } from "@motivefx/database";
import { requireAdmin } from "@/lib/admin";
import { notificationStorageEnabled, notificationSendingEnabled } from "@/lib/notifications/store";

export const dynamic = "force-dynamic";
export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return Response.json({ error: auth.error }, { status: auth.status });
  const enabled = notificationStorageEnabled();
  if (!enabled) return Response.json({ available: false, sendingEnabled: false, state: "activation_required",
    prerequisites: ["Apply the additive notification migration", "Verified recipient consent and device registration", "Verified unsubscribe and suppression lifecycle", "Provider receipts and controlled delivery acceptance", "Explicit outbound activation"] }, { headers: { "Cache-Control": "no-store" } });
  try {
    const states = await prisma.notificationDelivery.groupBy({ by: ["channel", "state"], _count: { _all: true } });
    return Response.json({ available: true, sendingEnabled: notificationSendingEnabled(), states, note: "Accepted means provider acknowledgment; device/inbox delivery remains unverified until receipt evidence." }, { headers: { "Cache-Control": "no-store" } });
  } catch { return Response.json({ available: false, sendingEnabled: false, state: "store_unavailable", states: null }, { status: 503 }); }
}
