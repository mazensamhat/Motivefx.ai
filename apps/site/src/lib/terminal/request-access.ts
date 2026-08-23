import { requireTerminalSession } from "./auth";
import { hasModule, iosAppStoreReaderPlan, planForUser, sandboxDemoPlan } from "./plan";
import { requireModule } from "./access";
import { isTrustedNativeReaderRequest } from "./ios-reader";
import { simHasModule } from "./simulation";

const DEMO_COOKIE = "motivefx_demo=1";

function isPublicDemoRequest(request: Request): boolean {
  const url = new URL(request.url);
  if (url.searchParams.get("demo") === "1") return true;
  const cookie = request.headers.get("cookie") ?? "";
  return cookie.split(";").some((c) => c.trim().startsWith(DEMO_COOKIE));
}

/**
 * Resolve user + plan from site cookie or public demo sandbox.
 * G3: anonymous ?user_id= must NEVER resolve a real account context.
 */
export async function resolveAccess(request: Request, module?: string) {
  // iOS App Store free reader: identical monitor content for every visitor —
  // web/Stripe subscriptions must not unlock exclusive digital features.
  if (await isTrustedNativeReaderRequest(request)) {
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

  /* G3: ignore anonymous user_id — do not load account entitlements without auth. */
  if (module) {
    throw new ModuleAccessError(module);
  }
  return { userId: "demo", plan: null, user: null, authenticated: false };
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
