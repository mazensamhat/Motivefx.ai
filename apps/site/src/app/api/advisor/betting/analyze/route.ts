import { json } from "@/lib/api";
import { accessErrorResponse, requireTerminalSession } from "@/lib/terminal/auth";
import { requireModuleOrSimAllowingIosReader } from "@/lib/terminal/access";
import { entitlementsPlanForUser } from "@/lib/terminal/ios-reader";
import { listBets } from "@/lib/terminal/bets";
import { analyzeBets, buildAdvisorResponse } from "@/lib/terminal/advisor-engine";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const auth = await requireTerminalSession();
  if (!auth.ok) return auth.response;
  const url = new URL(request.url);
  const userId = url.searchParams.get("user_id");
  if (!userId) return json({ detail: "Missing user_id" }, 400);
  try {
    if (auth.session.user.id !== userId) throw new Error("Access denied");
    requireModuleOrSimAllowingIosReader(request, await entitlementsPlanForUser(auth.session.user), auth.session.user, "betting");
    const bets = await listBets(userId);
    const analyzed = await analyzeBets(bets);
    return json(
      await buildAdvisorResponse("betting", analyzed.summary, analyzed.recs, { picks: analyzed.picks })
    );
  } catch (err) {
    return accessErrorResponse(err);
  }
}
