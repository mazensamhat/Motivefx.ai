import { json } from "@/lib/api";
import { moduleAccessResponse, resolveAccess } from "@/lib/terminal/request-access";
import { listBets } from "@/lib/terminal/bets";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const access = await resolveAccess(request, "betting");
    const bets = access.userId !== "demo" ? await listBets(access.userId) : [];
    const totalStake = bets.reduce((sum, b) => sum + (b.stake ?? 0), 0);
    return json({ items: bets, count: bets.length, totalStake: Math.round(totalStake * 100) / 100 });
  } catch (err) {
    return moduleAccessResponse(err);
  }
}
