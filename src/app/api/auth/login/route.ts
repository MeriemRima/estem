import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { createSession, verifyPassword, getUserOrganizations } from "@/lib/auth";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

function serverErrorMessage(error: unknown) {
  const msg = error instanceof Error ? error.message : String(error ?? "");
  if (msg.includes("AUTH_SECRET")) {
    return "Config Vercel manquante : AUTH_SECRET";
  }
  if (
    msg.includes("DATABASE_URL") ||
    msg.includes("Can't reach database") ||
    msg.includes("P1001") ||
    msg.includes("P1003") ||
    msg.includes("P1017") ||
    msg.includes("PrismaClientInitializationError") ||
    msg.includes("SQLite") ||
    msg.includes("no such table") ||
    msg.includes("does not exist")
  ) {
    return "Base de données indisponible — vérifie DATABASE_URL (PostgreSQL) sur Vercel";
  }
  return "Erreur serveur";
}

export async function POST(request: Request) {
  try {
    const body = loginSchema.parse(await request.json());
    const user = await prisma.user.findUnique({
      where: { email: body.email.toLowerCase() },
    });
    if (!user || !(await verifyPassword(body.password, user.passwordHash))) {
      return NextResponse.json({ error: "Identifiants incorrects" }, { status: 401 });
    }
    await createSession({
      id: user.id,
      email: user.email,
      name: user.name,
      isSuperAdmin: user.isSuperAdmin,
      isVendeur: user.isVendeur,
    });

    if (user.mustChangePassword) {
      return NextResponse.json({ ok: true, redirectTo: "/account/password" });
    }

    if (user.isSuperAdmin) {
      return NextResponse.json({ ok: true, redirectTo: "/super-admin" });
    }

    if (user.isVendeur) {
      return NextResponse.json({ ok: true, redirectTo: "/vendeur" });
    }

    const memberships = await getUserOrganizations(user.id);
    if (memberships.length === 1) {
      const orgId = memberships[0].organizationId;
      const role = memberships[0].role;
      const redirectTo =
        role === "OWNER" ? `/dashboard/${orgId}` : `/dashboard/${orgId}/kitchen`;
      return NextResponse.json({ ok: true, redirectTo });
    }
    return NextResponse.json({ ok: true, redirectTo: "/dashboard" });
  } catch (error) {
    console.error("[login]", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    }
    return NextResponse.json({ error: serverErrorMessage(error) }, { status: 500 });
  }
}
