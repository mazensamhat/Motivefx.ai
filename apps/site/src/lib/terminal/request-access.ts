import { requireTerminalSession } from "./auth";
import { findUserSafe } from "../load-user";
import { planForUser, sandboxDemoPlan } from "./plan";
import { requireModule } from "./access";

const DEMO_COOKIE = "motivefx_demo=1";

function isPublicDemoRequest(request: Request): boolean {
  const url = new URL(request.url);
  if (url.searchParams.get("demo") === "1") return true;
  const cookie = request.headers.get("cookie") ?? "";
  return cookie.split(";").some((c) => c.trim().startsWith(DEMO_COOKIE));
}

/** Resolve user + plan from site cookie, public demo sandbox, or user_id query for anonymous demo. */
export async function resolveAccess(request: Request, module?: string) {
  const url = new URL(request.url);
  const userIdParam = url.searchParams.get("user_id");

  const auth = await requireTerminalSession();
  if (auth.ok) {
    const plan = planForUser(auth.session.user);
    if (module) requireModule(plan, module);
    return { userId: auth.session.user.id, plan, user: auth.session.user, authenticated: true };
  }

  if (isPublicDemoRequest(request)) {
    const plan = sandboxDemoPlan();
    if (module) requireModule(plan, module);
    return { userId: "demo", plan, user: null, authenticated: false, demo: true as const };
  }

  if (userIdParam && userIdParam !== "demo") {
    const user = await findUserSafe({ id: userIdParam });
    if (user && !user.disabledAt) {
      const plan = planForUser(user);
      if (module) requireModule(plan, module);
      return { userId: user.id, plan, user, authenticated: false };
    }
  }

  if (module) {
    throw new ModuleAccessError(module);
  }
  return { userId: userIdParam ?? "demo", plan: null, user: null, authenticated: false };
}
export class ModuleAccessError extends Error {
  module: string;
  constructor(module: string) {
    super("Subscribe to unlock this intelligence market.");
    this.name = "ModuleAccessError";
    this.module = module;
  }
}

export function moduleAccessResponse(err: unknown) {
  if (err instanceof ModuleAccessError) {
    return Response.json(
      { detail: { code: "module_locked", module: err.module, message: err.message } },
      { status: 403 }
    );
  }
  throw err;
}
