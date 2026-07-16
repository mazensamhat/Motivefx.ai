import { json, serverError } from "@/lib/api";
import { buildHomeBriefing } from "@/lib/terminal/home-briefing";
import { requireTerminalSession } from "@/lib/terminal/auth";
import { planForUser } from "@/lib/terminal/plan";
import { upsertAlerts, listAlerts, unreadCount } from "@/lib/terminal/alerts";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get("user_id");
    const auth = await requireTerminalSession();
    const user = auth.ok ? auth.session.user : null;
    const effectiveId = user?.id ?? userId ?? "demo";
    const plan = user ? planForUser(user) : null;
    const displayName = user?.displayName ?? user?.email?.split("@")[0] ?? null;
    const briefing = await buildHomeBriefing({ displayName, userId: effectiveId, plan });

    if (user && plan?.features.push_notifications) {
      try {
        const radar =
          ((briefing.personalized as { radarHits?: Array<Record<string, unknown>> })?.radarHits) ??
          [];
        const alerts = radar.map((h) => ({
          module: String(h.module ?? ""),
          symbol: String(h.symbol ?? ""),
          title: `Radar hit: ${h.symbol}`,
          body: String(h.title ?? ""),
          confidence: Number(h.confidence ?? 0),
          alertKey: `radar-${h.id ?? h.symbol}`,
        }));
        for (const o of ((briefing.opportunities as Array<Record<string, unknown>>) ?? []).slice(0, 3)) {
          alerts.push({
            module: String(o.module ?? ""),
            symbol: String(o.symbol ?? ""),
            title: `Top signal: ${o.symbol}`,
            body: String(o.title ?? ""),
            confidence: Number(o.confidence ?? 0),
            alertKey: `signal-${o.id}`,
          });
        }
        if (alerts.length) await upsertAlerts(user.id, alerts);
        briefing.alertUnreadCount = unreadCount(await listAlerts(user.id));
      } catch {
        /* Alert sync must not block the daily briefing response. */
      }
    }

    return json(briefing);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Briefing unavailable";
    return serverError(message);
  }
}
