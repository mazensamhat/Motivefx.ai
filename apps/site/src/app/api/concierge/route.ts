import { z } from "zod";
import { prisma } from "@motivefx/database";
import { badRequest, forbidden, json, serverError, unauthorized } from "@/lib/api";
import { getSession } from "@/lib/session";
import { planForUser, hasFeature } from "@/lib/terminal/plan";
import { sendConciergeRequestEmail } from "@/lib/email";
import { SITE } from "@/lib/site-config";

export const dynamic = "force-dynamic";

const schema = z.object({
  kind: z.enum(["concierge", "onboarding"]),
  message: z.string().min(12).max(4000),
  pagePath: z.string().max(500).optional(),
});

/**
 * Ultra+ concierge + Elite white-glove onboarding intake.
 * Stores ProductFeedback and emails ops.
 */
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session?.id) return unauthorized();

    const user = await prisma.user.findUnique({ where: { id: session.id } });
    if (!user) return unauthorized();

    const plan = planForUser(user);
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) {
      return badRequest("Please describe what you need in at least a sentence.");
    }

    const { kind, message, pagePath } = parsed.data;

    if (kind === "concierge" && !hasFeature(plan, "concierge_support")) {
      return forbidden("Concierge support requires Ultra+ or Elite.");
    }
    if (kind === "onboarding" && !hasFeature(plan, "white_glove_onboarding")) {
      return forbidden("White-glove onboarding requires Elite.");
    }

    await prisma.productFeedback.create({
      data: {
        userId: user.id,
        email: user.email,
        kind,
        message,
        pagePath: pagePath ?? null,
      },
    });

    void sendConciergeRequestEmail({
      to: SITE.email,
      replyTo: user.email,
      kind,
      message,
      tier: plan.tier,
      userEmail: user.email,
    }).catch(() => undefined);

    return json(
      {
        ok: true,
        message:
          kind === "onboarding"
            ? "Onboarding request received — we'll reach out within 1 business day."
            : "Concierge request received — we'll reply within 1 business day.",
      },
      201
    );
  } catch (error) {
    console.error("[api/concierge]", error);
    return serverError("Could not submit request.");
  }
}
