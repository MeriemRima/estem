import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/auth";

type Params = { params: Promise<{ userId: string }> };

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const session = await requireSuperAdmin();
    const { userId } = await params;

    if (session.id === userId) {
      return NextResponse.json(
        { error: "Vous ne pouvez pas supprimer votre propre compte Super Admin" },
        { status: 400 }
      );
    }

    const target = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, isSuperAdmin: true },
    });

    if (!target) {
      return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
    }

    if (target.isSuperAdmin) {
      return NextResponse.json(
        { error: "Impossible de supprimer un compte Super Admin depuis cette interface" },
        { status: 400 }
      );
    }

    // Cascade in schema deletes memberships automatically
    await prisma.user.delete({ where: { id: userId } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "";
    const status = msg === "UNAUTHORIZED" ? 401 : msg === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ error: msg || "Erreur" }, { status });
  }
}
