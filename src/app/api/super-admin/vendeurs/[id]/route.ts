import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireSuperAdmin, hashPassword } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

function suggestPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < 10; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    await requireSuperAdmin();
    const { id } = await params;

    const vendeur = await prisma.user.findUnique({ where: { id } });
    if (!vendeur || !vendeur.isVendeur) {
      return NextResponse.json({ error: "Vendeur non trouvé" }, { status: 404 });
    }

    // Unlink restaurants owned by this vendeur before deleting
    await prisma.organization.updateMany({
      where: { vendeurId: id },
      data: { vendeurId: null },
    });

    await prisma.user.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "";
    const status = msg === "UNAUTHORIZED" ? 401 : msg === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ error: msg || "Erreur" }, { status });
  }
}

const resetSchema = z.object({
  newPassword: z.string().min(6).optional(),
});

export async function POST(request: Request, { params }: Params) {
  try {
    await requireSuperAdmin();
    const { id } = await params;
    const body = resetSchema.parse(await request.json().catch(() => ({})));

    const vendeur = await prisma.user.findUnique({ where: { id } });
    if (!vendeur || !vendeur.isVendeur) {
      return NextResponse.json({ error: "Vendeur non trouvé" }, { status: 404 });
    }

    const provisionalPassword = body.newPassword || suggestPassword();
    const passwordHash = await hashPassword(provisionalPassword);

    await prisma.user.update({
      where: { id },
      data: {
        passwordHash,
        mustChangePassword: true,
      },
    });

    return NextResponse.json({
      ok: true,
      email: vendeur.email,
      provisionalPassword,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "";
    const status = msg === "UNAUTHORIZED" ? 401 : msg === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ error: msg || "Erreur" }, { status });
  }
}
