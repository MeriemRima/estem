import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireSuperAdmin, hashPassword } from "@/lib/auth";
import { slugify } from "@/lib/utils";

const schema = z.object({
  restaurantName: z.string().min(2),
  ownerName: z.string().min(2),
  ownerEmail: z.string().email(),
  ownerPassword: z.string().min(6),
});

/** Admin des restaurants crée un resto + compte Gérant (MDP provisoire). */
export async function POST(request: Request) {
  try {
    await requireSuperAdmin();
    const body = schema.parse(await request.json());
    const email = body.ownerEmail.toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Email gérant déjà utilisé" }, { status: 400 });
    }
    let slug = slugify(body.restaurantName) || "restaurant";
    if (await prisma.organization.findUnique({ where: { slug } })) {
      slug = `${slug}-${Date.now().toString(36)}`;
    }
    const passwordHash = await hashPassword(body.ownerPassword);
    const org = await prisma.organization.create({
      data: {
        name: body.restaurantName,
        slug,
        memberships: {
          create: {
            role: "OWNER",
            user: {
              create: {
                name: body.ownerName,
                email,
                passwordHash,
                isSuperAdmin: false,
                mustChangePassword: true,
              },
            },
          },
        },
      },
      include: {
        memberships: {
          where: { role: "OWNER" },
          include: {
            user: { select: { id: true, name: true, email: true, mustChangePassword: true } },
          },
        },
      },
    });
    const owner = org.memberships[0]?.user ?? null;
    return NextResponse.json({
      id: org.id,
      name: org.name,
      slug: org.slug,
      owner,
      provisionalPassword: body.ownerPassword,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    }
    const msg = error instanceof Error ? error.message : "";
    const status = msg === "UNAUTHORIZED" ? 401 : msg === "FORBIDDEN" ? 403 : 400;
    return NextResponse.json({ error: msg || "Erreur" }, { status });
  }
}
