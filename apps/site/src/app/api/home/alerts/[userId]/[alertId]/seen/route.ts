import { json, badRequest } from "@/lib/api";
import { accessErrorResponse, assertUserMatch, requireTerminalSession } from "@/lib/terminal/auth";
import { requireFeature } from "@/lib/terminal/access";
import { entitlementsPlanForUser } from "@/lib/terminal/ios-reader";
import { listAlerts, markAlertSeen, unreadCount } from "@/lib/terminal/alerts";

export const dynamic = "force-dynamic";

export async function POST(_req: Request, ctx: { params: Promise<{ userId: string; alertId: string }> }) {
  const auth = await requireTerminalSession();
  if (!auth.ok) return auth.response;
  const { userId, alertId } = await ctx.params;
  try {
    assertUserMatch(auth.session, userId);
    requireFeature(await entitlementsPlanForUser(auth.session.user), "push_notifications");
    if (!(await markAlertSeen(userId, alertId))) return badRequest("Alert not found.");
    const alerts = await listAlerts(userId);
    return json({ seen: true, alerts, unreadCount: unreadCount(alerts) });
  } catch (err) {
    return accessErrorResponse(err);
  }
}
