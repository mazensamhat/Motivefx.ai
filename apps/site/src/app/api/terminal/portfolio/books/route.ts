import { badRequest, json } from "@/lib/api";
import { requireTerminalSession, accessErrorResponse } from "@/lib/terminal/auth";
import { planForUser, hasFeature } from "@/lib/terminal/plan";
import { requireFeature } from "@/lib/terminal/access";
import {
  createPortfolioBook,
  isPortfolioModule,
  listPortfolioBooks,
  renamePortfolioBook,
  switchPortfolioBook,
  type PortfolioModule,
} from "@/lib/terminal/portfolio";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireTerminalSession();
  if (!auth.ok) return auth.response;
  try {
    const plan = planForUser(auth.session.user);
    requireFeature(plan, "multiple_portfolios");
    const module = new URL(request.url).searchParams.get("module") ?? "";
    if (!isPortfolioModule(module)) return badRequest("module must be trades|crypto|penny");
    const books = await listPortfolioBooks(auth.session.user.id, module);
    return json({ books, canMulti: hasFeature(plan, "multiple_portfolios") });
  } catch (err) {
    return accessErrorResponse(err);
  }
}

export async function POST(request: Request) {
  const auth = await requireTerminalSession();
  if (!auth.ok) return auth.response;
  try {
    const plan = planForUser(auth.session.user);
    requireFeature(plan, "multiple_portfolios");
    let body: {
      action?: string;
      module?: string;
      bookId?: string;
      name?: string;
    } = {};
    try {
      body = (await request.json()) as typeof body;
    } catch {
      return badRequest("JSON body required");
    }
    if (!body.module || !isPortfolioModule(body.module)) {
      return badRequest("module must be trades|crypto|penny");
    }
    const module = body.module as PortfolioModule;
    const action = body.action ?? "list";

    if (action === "list") {
      return json({ books: await listPortfolioBooks(auth.session.user.id, module) });
    }
    if (action === "create") {
      const books = await createPortfolioBook(
        auth.session.user.id,
        module,
        body.name ?? `Portfolio ${Date.now()}`
      );
      return json({ books });
    }
    if (action === "switch") {
      if (!body.bookId) return badRequest("bookId required");
      const books = await switchPortfolioBook(auth.session.user.id, module, body.bookId);
      return json({ books });
    }
    if (action === "rename") {
      if (!body.bookId || !body.name?.trim()) return badRequest("bookId and name required");
      const books = await renamePortfolioBook(
        auth.session.user.id,
        module,
        body.bookId,
        body.name
      );
      return json({ books });
    }
    return badRequest("Unknown action");
  } catch (err) {
    return accessErrorResponse(err);
  }
}
