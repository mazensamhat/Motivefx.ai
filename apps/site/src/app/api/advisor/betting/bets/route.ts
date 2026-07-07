import { badRequest, json } from "@/lib/api";
import { accessErrorResponse, assertUserMatch, requireTerminalSession } from "@/lib/terminal/auth";
import { requireModule } from "@/lib/terminal/access";
import { planForUser, hasModule } from "@/lib/terminal/plan";
import { addBet } from "@/lib/terminal/bets";
import { simHasModule } from "@/lib/terminal/simulation";
import { settleSimulationBet } from "@/lib/terminal/simulation-settle";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const auth = await requireTerminalSession();
  if (!auth.ok) return auth.response;
  const body = (await request.json()) as {
    user_id?: string;
    matchup?: string;
    pick?: string;
    odds?: string;
    stake?: number;
    sport?: string;
  };
  if (!body.user_id || !body.matchup || !body.pick) return badRequest("Missing required fields.");
  try {
    assertUserMatch(auth.session, body.user_id);
    const plan = planForUser(auth.session.user);
    requireModule(plan, "betting");
    const isSim = simHasModule(auth.session.user, "betting") && !hasModule(plan, "betting");
    const betId = await addBet(body.user_id, {
      matchup: body.matchup,
      pick: body.pick,
      odds: body.odds,
      stake: body.stake,
      sport: body.sport,
      isSimulation: isSim,
    });
    const result: Record<string, unknown> = { id: betId };
    if (isSim) {
      result.simulation = await settleSimulationBet(
        betId,
        body.user_id,
        body.matchup,
        body.pick,
        body.odds ?? "-110",
        body.stake ?? 25
      );
    }
    return json(result);
  } catch (err) {
    return accessErrorResponse(err);
  }
}
