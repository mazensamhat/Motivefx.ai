import { badRequest, json } from "@/lib/api";
import { accessErrorResponse, assertUserMatch, requireTerminalSession } from "@/lib/terminal/auth";
import { requireModuleOrSim } from "@/lib/terminal/access";
import { planForUser, hasModule } from "@/lib/terminal/plan";
import { addPrediction } from "@/lib/terminal/predictions";
import { simHasModule } from "@/lib/terminal/simulation";
import { settleSimulationPrediction } from "@/lib/terminal/simulation-settle";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const auth = await requireTerminalSession();
  if (!auth.ok) return auth.response;
  const body = (await request.json()) as {
    user_id?: string;
    market?: string;
    category?: string;
    pick?: string;
    stake?: number;
    yes_price?: number;
  };
  if (!body.user_id || !body.market || !body.pick) return badRequest("Missing required fields.");
  try {
    assertUserMatch(auth.session, body.user_id);
    const plan = planForUser(auth.session.user);
    requireModuleOrSim(plan, auth.session.user, "predictions");
    const isSim = simHasModule(auth.session.user, "predictions") && !hasModule(plan, "predictions");
    const yesPrice = body.yes_price ?? 0.5;
    const pid = await addPrediction(body.user_id, {
      market: body.market,
      category: body.category,
      pick: body.pick,
      stake: body.stake,
      yesPrice,
      isSimulation: isSim,
    });
    const result: Record<string, unknown> = { id: pid };
    if (isSim) {
      result.simulation = await settleSimulationPrediction(
        pid,
        body.user_id,
        body.market,
        body.pick,
        body.stake ?? 25,
        yesPrice
      );
    }
    return json(result);
  } catch (err) {
    return accessErrorResponse(err);
  }
}
