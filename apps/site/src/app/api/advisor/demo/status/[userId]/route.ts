import { json } from "@/lib/api";
import { accessErrorResponse, assertUserMatch, requireTerminalSession } from "@/lib/terminal/auth";
import { demoStatus } from "@/lib/terminal/demo-data";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ userId: string }> }) {
  const auth = await requireTerminalSession();
  if (!auth.ok) return auth.response;
  const { userId } = await ctx.params;
  try {
    assertUserMatch(auth.session, userId);
    return json(await demoStatus(userId));
  } catch (err) {
    return accessErrorResponse(err);
  }
}
