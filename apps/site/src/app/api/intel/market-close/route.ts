import { json } from "@/lib/api";
import { requireTerminalSession } from "@/lib/terminal/auth";
import { buildMarketClose } from "@/lib/terminal/intelligence-dashboard";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireTerminalSession();
  return json(await buildMarketClose(auth.ok ? auth.session.user.id : null));
}
