import { json } from "@/lib/api";
import { accessErrorResponse, assertUserMatch, requireTerminalSession } from "@/lib/terminal/auth";
import { removeWatchlistItem, listWatchlist } from "@/lib/terminal/watchlist";

export const dynamic = "force-dynamic";

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ userId: string; module: string; symbol: string }> }
) {
  const auth = await requireTerminalSession();
  if (!auth.ok) return auth.response;
  const { userId, module, symbol } = await ctx.params;
  try {
    assertUserMatch(auth.session, userId);
    await removeWatchlistItem(userId, module.toLowerCase(), symbol);
    return json({ removed: true, items: await listWatchlist(userId) });
  } catch (err) {
    return accessErrorResponse(err);
  }
}
