import { badRequest, json } from "@/lib/api";
import { requireTerminalSession, accessErrorResponse } from "@/lib/terminal/auth";
import { entitlementsPlanForUser } from "@/lib/terminal/ios-reader";
import { requireFeature } from "@/lib/terminal/access";
import {
  createApiKey,
  getUserTeam,
  listApiKeys,
  revokeApiKey,
} from "@/lib/terminal/institutional";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireTerminalSession();
  if (!auth.ok) return auth.response;
  try {
    const plan = await entitlementsPlanForUser(auth.session.user);
    requireFeature(plan, "api_access");
    const keys = await listApiKeys(auth.session.user.id);
    return json({ keys });
  } catch (err) {
    return accessErrorResponse(err);
  }
}

export async function POST(request: Request) {
  const auth = await requireTerminalSession();
  if (!auth.ok) return auth.response;
  try {
    const plan = await entitlementsPlanForUser(auth.session.user);
    requireFeature(plan, "api_access");
    let body: { name?: string } = {};
    try {
      body = (await request.json()) as typeof body;
    } catch {
      return badRequest("JSON body required");
    }
    const team = await getUserTeam(auth.session.user.id);
    const created = await createApiKey({
      userId: auth.session.user.id,
      teamId: team?.id,
      name: body.name ?? "Terminal key",
    });
    return json({
      key: {
        id: created.key.id,
        name: created.key.name,
        keyPrefix: created.key.keyPrefix,
        createdAt: created.key.createdAt,
      },
      /** Shown once — store securely. */
      secret: created.secret,
    });
  } catch (err) {
    return accessErrorResponse(err);
  }
}

export async function DELETE(request: Request) {
  const auth = await requireTerminalSession();
  if (!auth.ok) return auth.response;
  try {
    const plan = await entitlementsPlanForUser(auth.session.user);
    requireFeature(plan, "api_access");
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    if (!id) return badRequest("id required");
    const ok = await revokeApiKey(auth.session.user.id, id);
    return json({ revoked: ok });
  } catch (err) {
    return accessErrorResponse(err);
  }
}
