import { badRequest, json } from "@/lib/api";
import { accessErrorResponse, assertUserMatch, requireTerminalSession } from "@/lib/terminal/auth";
import { seedDemoUser } from "@/lib/terminal/demo-data";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const auth = await requireTerminalSession();
  if (!auth.ok) return auth.response;
  const body = (await request.json()) as { user_id?: string; force?: boolean };
  if (!body.user_id) return badRequest("Missing user_id.");
  try {
    assertUserMatch(auth.session, body.user_id);
    return json(await seedDemoUser(body.user_id, Boolean(body.force)));
  } catch (err) {
    return accessErrorResponse(err);
  }
}
