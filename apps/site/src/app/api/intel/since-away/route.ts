import { json } from "@/lib/api";
import { requireTerminalSession } from "@/lib/terminal/auth";
import { buildSinceAway } from "@/lib/terminal/intelligence-dashboard";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireTerminalSession();
  if (!auth.ok) return auth.response;
  const since = new URL(request.url).searchParams.get("since") ?? new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  return json(await buildSinceAway(auth.session.user.id, since));
}
