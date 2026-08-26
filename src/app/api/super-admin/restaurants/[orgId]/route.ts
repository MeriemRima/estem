import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/auth";

type Params = { params: Promise<{ orgId: string }> };

export async function DELETE(_request: Request, { params }: Params) {
  try {
    await requireSuperAdmin();
    const { orgId } = await params;
    await prisma.organization.delete({ where: { id: orgId } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "";
    const status = msg === "UNAUTHORIZED" ? 401 : msg === "FORBIDDEN" ? 403 : 400;
    return NextResponse.json({ error: msg || "Erreur" }, { status });
  }
}
