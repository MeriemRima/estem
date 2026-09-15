import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireVendeur, hashPassword } from "@/lib/auth";

type Params = { params: Promise<{ orgId: string }> };

function suggestPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < 10; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

const assignOwnerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6).optional(),
});

/** Vendeur crée/assigne un Gérant (OWNER) pour son restaurant */
export async function POST(request: Request, { params }: Params) {
  try {
    const user = await requireVendeur();
    const { orgId } = await params;

    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { id: true, name: true, vendeurId: true },
    });

    if (!org) {
      return NextResponse.json({ error: "Restaurant non trouvé" }, { status: 404 });
    }

    if (!user.isSuperAdmin && org.vendeurId !== user.id) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    const body = assignOwnerSchema.parse(await request.json());
    const email = body.email.toLowerCase();

    let ownerUser = await prisma.user.findUnique({ where: { email } });
    const passwordToUse = body.password || suggestPassword();

    if (!ownerUser) {
      const passwordHash = await hashPassword(passwordToUse);
      ownerUser = await prisma.user.create({
        data: {
          name: body.name,
          email,
          passwordHash,
          isSuperAdmin: false,
          isVendeur: false,
          mustChangePassword: true,
        },
      });
    }

    // Connect user as OWNER to this org
    await prisma.membership.upsert({
      where: {
        userId_organizationId: { userId: ownerUser.id, organizationId: orgId },
      },
      create: {
        userId: ownerUser.id,
        organizationId: orgId,
        role: "OWNER",
      },
      update: {
        role: "OWNER",
      },
    });

    return NextResponse.json({
      ok: true,
      user: {
        id: ownerUser.id,
        name: ownerUser.name,
        email: ownerUser.email,
        mustChangePassword: ownerUser.mustChangePassword,
      },
      provisionalPassword: passwordToUse,
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

/** Reset Gérant password by Vendeur */
export async function PUT(request: Request, { params }: Params) {
  try {
    const user = await requireVendeur();
    const { orgId } = await params;

    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { id: true, name: true, vendeurId: true },
    });

    if (!org) {
      return NextResponse.json({ error: "Restaurant non trouvé" }, { status: 404 });
    }

    if (!user.isSuperAdmin && org.vendeurId !== user.id) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    const ownerMembership = await prisma.membership.findFirst({
      where: { organizationId: orgId, role: "OWNER" },
      include: { user: true },
    });

    if (!ownerMembership || !ownerMembership.user) {
      return NextResponse.json({ error: "Aucun gérant assigné à ce restaurant" }, { status: 404 });
    }

    const provisionalPassword = suggestPassword();
    const passwordHash = await hashPassword(provisionalPassword);

    await prisma.user.update({
      where: { id: ownerMembership.user.id },
      data: {
        passwordHash,
        mustChangePassword: true,
      },
    });

    return NextResponse.json({
      ok: true,
      email: ownerMembership.user.email,
      provisionalPassword,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "";
    const status = msg === "UNAUTHORIZED" ? 401 : msg === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ error: msg || "Erreur" }, { status });
  }
}
