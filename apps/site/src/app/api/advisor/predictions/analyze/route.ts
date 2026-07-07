import { json } from "@/lib/api";
import { accessErrorResponse, requireTerminalSession } from "@/lib/terminal/auth";
import { requireModule } from "@/lib/terminal/access";
import { planForUser } from "@/lib/terminal/plan";
import { listPredictions } from "@/lib/terminal/predictions";
import { analyzePredictions, buildAdvisorResponse } from "@/lib/terminal/advisor-engine";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const auth = await requireTerminalSession();
  if (!auth.ok) return auth.response;
  const url = new URL(request.url);
  const userId = url.searchParams.get("user_id");
  if (!userId) return json({ detail: "Missing user_id" }, 400);
  try {
    if (auth.session.user.id !== userId) throw new Error("Access denied");
    requireModule(planForUser(auth.session.user), "predictions");
    const positions = await listPredictions(userId);
    const analyzed = await analyzePredictions(positions);
    return json(await buildAdvisorResponse("predictions", analyzed.summary, analyzed.recs));
  } catch (err) {
    return accessErrorResponse(err);
  }
}
