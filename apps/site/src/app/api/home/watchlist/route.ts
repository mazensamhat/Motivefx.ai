import { badRequest, json } from "@/lib/api";
import { accessErrorResponse, assertUserMatch, requireTerminalSession } from "@/lib/terminal/auth";
import { requireModule } from "@/lib/terminal/access";
import { planForUser } from "@/lib/terminal/plan";
import { addWatchlistItem, listWatchlist } from "@/lib/terminal/watchlist";

const WATCHLIST_MODULES = new Set(["trades", "crypto", "penny", "betting", "predictions"]);

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const auth = await requireTerminalSession();
  if (!auth.ok) return auth.response;
  const body = (await request.json()) as { user_id?: string; module?: string; symbol?: string };
  if (!body.user_id || !body.module || !body.symbol) return badRequest("Missing fields.");
  const mod = body.module.toLowerCase();
  if (!WATCHLIST_MODULES.has(mod)) return badRequest(`Module must be one of: ${[...WATCHLIST_MODULES].join(", ")}`);
  try {
    assertUserMatch(auth.session, body.user_id);
    requireModule(planForUser(auth.session.user), mod);
    await addWatchlistItem(body.user_id, mod, body.symbol);
    return json({ saved: true, items: await listWatchlist(body.user_id) });
  } catch (err) {
    return accessErrorResponse(err);
  }
}
