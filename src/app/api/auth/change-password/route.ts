import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import {
  hashPassword,
  requireUser,
  verifyPassword,
  getUserOrganizations,
} from "@/lib/auth";

const schema = z.object({
  currentPassword: z.string().optional(),
  newPassword: z.string().min(6),
});

/** Remplace le mot de passe (provisoire ou classique). */
export async function POST(request: Request) {
  try {
    const session = await requireUser();
    const body = schema.parse(await request.json());
    const user = await prisma.user.findUnique({ where: { id: session.id } });
    if (!user) {
      return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
    }

    // Déjà connecté avec MDP provisoire → pas besoin de le retaper
    if (!user.mustChangePassword) {
      if (!body.currentPassword) {
        return NextResponse.json({ error: "Mot de passe actuel requis" }, { status: 400 });
      }
      if (!(await verifyPassword(body.currentPassword, user.passwordHash))) {
        return NextResponse.json({ error: "Mot de passe actuel incorrect" }, { status: 400 });
      }
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: await hashPassword(body.newPassword),
        mustChangePassword: false,
      },
    });

    if (user.isSuperAdmin) {
      return NextResponse.json({ ok: true, redirectTo: "/super-admin" });
    }
    const memberships = await getUserOrganizations(user.id);
    if (memberships.length === 1) {
      const m = memberships[0];
      const redirectTo =
        m.role === "OWNER"
          ? `/dashboard/${m.organizationId}`
          : `/dashboard/${m.organizationId}/kitchen`;
      return NextResponse.json({ ok: true, redirectTo });
    }
    return NextResponse.json({ ok: true, redirectTo: "/dashboard" });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    }
    const msg = error instanceof Error ? error.message : "";
    const status = msg === "UNAUTHORIZED" ? 401 : 400;
    return NextResponse.json({ error: msg || "Erreur" }, { status });
  }
}
