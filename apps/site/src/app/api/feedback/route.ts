import { z } from "zod";

import { prisma } from "@motivefx/database";

import { badRequest, json, serverError, unauthorized } from "@/lib/api";

import { getSession } from "@/lib/session";



const schema = z.object({

  kind: z.enum(["bug", "feature", "billing", "other"]),

  message: z.string().min(8).max(4000),

  pagePath: z.string().max(500).optional(),

});



export async function POST(request: Request) {

  try {

    const session = await getSession();

    if (!session) return unauthorized();



    const parsed = schema.safeParse(await request.json());

    if (!parsed.success) {

      return badRequest("Please write at least a few words describing your feedback.");

    }



    await prisma.productFeedback.create({

      data: {

        userId: session.id,

        email: session.email,

        kind: parsed.data.kind,

        message: parsed.data.message,

        pagePath: parsed.data.pagePath ?? null,

      },

    });



    return json({ ok: true }, 201);

  } catch (error) {

    console.error("[api/feedback]", error);

    return serverError("Could not save feedback.");

  }

}

