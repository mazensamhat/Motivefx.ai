import { json } from "@/lib/api";
import { accessErrorResponse, assertUserMatch, requireTerminalSession } from "@/lib/terminal/auth";
import { requireFeature } from "@/lib/terminal/access";
import { planForUser } from "@/lib/terminal/plan";
import { listAlerts, markAllAlertsSeen } from "@/lib/terminal/alerts";

export const dynamic = "force-dynamic";

export async function POST(_req: Request, ctx: { params: Promise<{ userId: string }> }) {
  const auth = await requireTerminalSession();
  if (!auth.ok) return auth.response;
  const { userId } = await ctx.params;
  try {
    assertUserMatch(auth.session, userId);
    requireFeature(planForUser(auth.session.user), "push_notifications");
    await markAllAlertsSeen(userId);
    const alerts = await listAlerts(userId);
    return json({ seenAll: true, alerts, unreadCount: 0 });
  } catch (err) {
    return accessErrorResponse(err);
  }
}
