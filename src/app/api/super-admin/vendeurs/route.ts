import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireSuperAdmin, hashPassword } from "@/lib/auth";

export async function GET() {
  try {
    await requireSuperAdmin();
    const vendeurs = await prisma.user.findMany({
      where: { isVendeur: true },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        mustChangePassword: true,
        createdAt: true,
        _count: {
          select: { vendeurOrganizations: true },
        },
        vendeurOrganizations: {
          select: {
            id: true,
            name: true,
            slug: true,
            createdAt: true,
          },
        },
      },
    });

    return NextResponse.json(vendeurs);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "";
    const status = msg === "UNAUTHORIZED" ? 401 : msg === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ error: msg || "Erreur" }, { status });
  }
}

const createVendeurSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
});

export async function POST(request: Request) {
  try {
    await requireSuperAdmin();
    const body = createVendeurSchema.parse(await request.json());
    const email = body.email.toLowerCase();

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Un compte avec cet email existe déjà" }, { status: 400 });
    }

    const passwordHash = await hashPassword(body.password);
    const vendeur = await prisma.user.create({
      data: {
        name: body.name,
        email,
        passwordHash,
        isSuperAdmin: false,
        isVendeur: true,
        mustChangePassword: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        mustChangePassword: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      vendeur,
      provisionalPassword: body.password,
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
