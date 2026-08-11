import { requireTerminalSession } from "./auth";
import { findUserSafe } from "../load-user";
import { hasModule, iosAppStoreReaderPlan, planForUser, sandboxDemoPlan } from "./plan";
import { requireModule } from "./access";
import { isNativeIosAppStoreRequest } from "./ios-reader";
import { simHasModule } from "./simulation";

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

  // iOS App Store free reader: identical monitor content for every visitor —
  // web/Stripe subscriptions must not unlock exclusive digital features.
  if (isNativeIosAppStoreRequest(request)) {
    const auth = await requireTerminalSession();
    const plan = iosAppStoreReaderPlan();
    if (module) requireModule(plan, module);
    if (auth.ok) {
      return {
        userId: auth.session.user.id,
        plan,
        user: auth.session.user,
        authenticated: true,
      };
    }
    return {
      userId: "demo",
      plan,
      user: null,
      authenticated: false,
      demo: true as const,
    };
  }

  const auth = await requireTerminalSession();
  if (auth.ok) {
    const user = auth.session.user;
    const plan = planForUser(user);
    if (module) {
      const entitled =
        hasModule(plan, module) || Boolean(simHasModule(user, module));
      if (!entitled) {
        requireModule(plan, module);
      }
    }
    return { userId: user.id, plan, user, authenticated: true };
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
