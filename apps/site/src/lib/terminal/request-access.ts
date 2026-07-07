import { prisma } from "@motivefx/database";
import { requireTerminalSession } from "./auth";
import { planForUser } from "./plan";
import { requireModule } from "./access";

/** Resolve user + plan from site cookie, or from user_id query param for anonymous demo. */
export async function resolveAccess(request: Request, module?: string) {
  const url = new URL(request.url);
  const userIdParam = url.searchParams.get("user_id");

  const auth = await requireTerminalSession();
  if (auth.ok) {
    const plan = planForUser(auth.session.user);
    if (module) requireModule(plan, module);
    return { userId: auth.session.user.id, plan, user: auth.session.user, authenticated: true };
  }

  if (userIdParam && userIdParam !== "demo") {
    const user = await prisma.user.findUnique({ where: { id: userIdParam } });
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
