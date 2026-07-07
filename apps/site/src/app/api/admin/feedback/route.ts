import { prisma } from "@motivefx/database";
import { requireAdmin } from "@/lib/admin";
import { forbidden, json, serverError, unauthorized } from "@/lib/api";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) {
    if (auth.status === 401) return unauthorized(auth.error);
    return forbidden(auth.error);
  }

  try {
    const rows = await prisma.productFeedback.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        email: true,
        kind: true,
        message: true,
        pagePath: true,
        createdAt: true,
      },
    });

    return json({
      feedback: rows.map((r) => ({
        id: r.id,
        kind: r.kind,
        message: r.message,
        pagePath: r.pagePath,
        createdAt: r.createdAt.toISOString(),
        user: { email: r.email, name: null },
      })),
    });
  } catch (error) {
    console.error("[admin/feedback]", error);
    return serverError("Could not load feedback.");
  }
}
