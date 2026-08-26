import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { createSession, hashPassword } from "@/lib/auth";
import { slugify } from "@/lib/utils";

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  restaurantName: z.string().min(2),
});

export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());
    const existing = await prisma.user.findUnique({ where: { email: body.email.toLowerCase() } });
    if (existing) {
      return NextResponse.json({ error: "Email déjà utilisé" }, { status: 400 });
    }

    let slug = slugify(body.restaurantName) || "restaurant";
    const slugTaken = await prisma.organization.findUnique({ where: { slug } });
    if (slugTaken) slug = `${slug}-${Date.now().toString(36)}`;

    const passwordHash = await hashPassword(body.password);
    const user = await prisma.user.create({
      data: {
        name: body.name,
        email: body.email.toLowerCase(),
        passwordHash,
        memberships: {
          create: {
            role: "OWNER",
            organization: {
              create: {
                name: body.restaurantName,
                slug,
              },
            },
          },
        },
      },
      include: {
        memberships: { include: { organization: true } },
      },
    });

    await createSession({
      id: user.id,
      email: user.email,
      name: user.name,
      isSuperAdmin: false,
    });
    const org = user.memberships[0]?.organization;
    return NextResponse.json({ ok: true, organizationId: org?.id, slug: org?.slug });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
