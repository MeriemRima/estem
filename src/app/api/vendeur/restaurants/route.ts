import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireVendeur, hashPassword } from "@/lib/auth";
import { slugify } from "@/lib/utils";

const createRestaurantSchema = z.object({
  restaurantName: z.string().min(2),
  ownerName: z.string().min(2).optional(),
  ownerEmail: z.string().email().optional(),
  ownerPassword: z.string().min(6).optional(),
});

export async function GET() {
  try {
    const user = await requireVendeur();
    const restaurants = await prisma.organization.findMany({
      where: user.isSuperAdmin ? {} : { vendeurId: user.id },
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: {
            memberships: true,
            items: true,
            tables: true,
            orders: true,
          },
        },
        memberships: {
          where: { role: "OWNER" },
          take: 1,
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                mustChangePassword: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json(
      restaurants.map((r) => ({
        id: r.id,
        name: r.name,
        slug: r.slug,
        createdAt: r.createdAt,
        counts: r._count,
        owner: r.memberships[0]?.user ?? null,
      })),
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : "";
    const status = msg === "UNAUTHORIZED" ? 401 : msg === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ error: msg || "Erreur" }, { status });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireVendeur();
    const body = createRestaurantSchema.parse(await request.json());

    let slug = slugify(body.restaurantName) || "restaurant";
    if (await prisma.organization.findUnique({ where: { slug } })) {
      slug = `${slug}-${Date.now().toString(36)}`;
    }

    let ownerUser: { id: string; name: string; email: string; mustChangePassword: boolean } | null = null;
    let provisionalPassword: string | undefined = undefined;

    // Direct create or assign owner if provided
    if (body.ownerEmail && body.ownerName && body.ownerPassword) {
      const email = body.ownerEmail.toLowerCase();
      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        return NextResponse.json({ error: "Cet email est déjà utilisé par un utilisateur" }, { status: 400 });
      }
      provisionalPassword = body.ownerPassword;
    }

    const org = await prisma.organization.create({
      data: {
        name: body.restaurantName,
        slug,
        vendeurId: user.isSuperAdmin ? null : user.id,
        ...(body.ownerEmail && body.ownerName && body.ownerPassword
          ? {
              memberships: {
                create: {
                  role: "OWNER",
                  user: {
                    create: {
                      name: body.ownerName,
                      email: body.ownerEmail.toLowerCase(),
                      passwordHash: await hashPassword(body.ownerPassword),
                      isSuperAdmin: false,
                      isVendeur: false,
                      mustChangePassword: true,
                    },
                  },
                },
              },
            }
          : {}),
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

    ownerUser = org.memberships[0]?.user ?? null;

    return NextResponse.json({
      id: org.id,
      name: org.name,
      slug: org.slug,
      owner: ownerUser,
      provisionalPassword,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    }
    const msg = error instanceof Error ? error.message : "";
    const status = msg === "UNAUTHORIZED" ? 401 : msg === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ error: msg || "Erreur" }, { status });
  }
}
