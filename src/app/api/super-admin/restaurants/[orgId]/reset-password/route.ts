import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireSuperAdmin, hashPassword } from "@/lib/auth";

type Params = { params: Promise<{ orgId: string }> };

const schema = z.object({
  password: z.string().min(6).optional(),
});

function suggestPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < 10; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

/** Admin plateforme : nouveau MDP provisoire pour le gérant. */
export async function POST(request: Request, { params }: Params) {
  try {
    await requireSuperAdmin();
    const { orgId } = await params;
    const body = schema.parse(await request.json().catch(() => ({})));
    const password = body.password || suggestPassword();

    const membership = await prisma.membership.findFirst({
      where: { organizationId: orgId, role: "OWNER" },
      include: { user: { select: { id: true, email: true, name: true } } },
    });
    if (!membership) {
      return NextResponse.json({ error: "Aucun gérant pour ce restaurant" }, { status: 404 });
    }

    await prisma.user.update({
      where: { id: membership.userId },
      data: {
        passwordHash: await hashPassword(password),
        mustChangePassword: true,
      },
    });

    return NextResponse.json({
      ok: true,
      email: membership.user.email,
      name: membership.user.name,
      provisionalPassword: password,
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
