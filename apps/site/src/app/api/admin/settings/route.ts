import { requireAdmin, getAdminEmails } from "@/lib/admin";
import { forbidden, json, serverError, unauthorized } from "@/lib/api";
import { getDataMode } from "@/lib/terminal/market-truth/data-mode";
import {
  MOTIVE_CORP_URL,
  MOTIVEIQ_OPS_URL,
  MOTIVELIFE_OPS_URL,
  MOTIVEPULSE_OPS_URL,
} from "@/lib/ops-links";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) {
    if (auth.status === 401) return unauthorized(auth.error);
    return forbidden(auth.error);
  }

  try {
    const admins = getAdminEmails();

    return json({
      generatedAt: new Date().toISOString(),
      dataMode: getDataMode(),
      adminEmails: {
        count: admins.length,
        configured: admins.length > 0,
        note:
          admins.length > 0
            ? `${admins.length} admin email(s) in ADMIN_EMAILS. List not exposed in UI.`
            : "No ADMIN_EMAILS — lock admin console until configured.",
      },
      opsLinks: [
        { label: "Motive Life Marketing Studio (Growth)", href: MOTIVELIFE_OPS_URL, external: true },
        { label: "MotivePulse Ops", href: MOTIVEPULSE_OPS_URL, external: true },
        { label: "Motive IQ Console", href: MOTIVEIQ_OPS_URL, external: true },
        { label: "Motive Corp", href: MOTIVE_CORP_URL, external: true },
        { label: "Market Truth console", href: "/admin/market-truth", external: false },
        { label: "Release gates", href: "/admin/releases", external: false },
      ],
    });
  } catch (error) {
    console.error("[admin/settings]", error);
    return serverError("Could not load settings.");
  }
}
