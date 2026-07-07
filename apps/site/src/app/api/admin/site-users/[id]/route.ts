import { prisma } from "@motivefx/database";
import { requireAdmin } from "@/lib/admin";
import { badRequest, forbidden, json, serverError, unauthorized } from "@/lib/api";

export async function DELETE(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    if (auth.status === 401) return unauthorized(auth.error);
    return forbidden(auth.error);
  }

  const { id } = await ctx.params;
  if (!id) return badRequest("Missing user id.");

  if (auth.session.id === id) {
    return badRequest("You cannot delete your own account from the ops console.");
  }

  try {
    await prisma.user.delete({ where: { id } });
    return json({ ok: true, deleted: id });
  } catch (error) {
    console.error("[admin/site-users DELETE]", error);
    return serverError("Could not delete user.");
  }
}
