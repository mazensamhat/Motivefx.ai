import { json } from "@/lib/api";
import { accessErrorResponse, assertUserMatch, requireTerminalSession } from "@/lib/terminal/auth";
import { requireFeature } from "@/lib/terminal/access";
import { planForUser } from "@/lib/terminal/plan";
import { listAlerts, unreadCount } from "@/lib/terminal/alerts";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ userId: string }> }) {
  const auth = await requireTerminalSession();
  if (!auth.ok) return auth.response;
  const { userId } = await ctx.params;
  try {
    assertUserMatch(auth.session, userId);
    requireFeature(planForUser(auth.session.user), "push_notifications");
    const alerts = await listAlerts(userId);
    return json({ alerts, unreadCount: unreadCount(alerts) });
  } catch (err) {
    return accessErrorResponse(err);
  }
}
