import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireOrgAccess } from "@/lib/auth";

type Params = { params: Promise<{ orgId: string; tableId: string }> };

const patchSchema = z.object({
  name: z.string().min(1),
});

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { orgId, tableId } = await params;
    await requireOrgAccess(orgId, ["OWNER", "ADMIN"]);
    const body = patchSchema.parse(await request.json());
    const existing = await prisma.diningTable.findFirst({
      where: { id: tableId, organizationId: orgId },
    });
    if (!existing) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
    const table = await prisma.diningTable.update({
      where: { id: tableId },
      data: { name: body.name },
    });
    return NextResponse.json(table);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "";
    const status = msg === "UNAUTHORIZED" ? 401 : msg === "FORBIDDEN" ? 403 : 400;
    return NextResponse.json({ error: msg || "Erreur" }, { status });
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { orgId, tableId } = await params;
    await requireOrgAccess(orgId, ["OWNER", "ADMIN"]);
    const existing = await prisma.diningTable.findFirst({
      where: { id: tableId, organizationId: orgId },
    });
    if (!existing) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
    await prisma.diningTable.delete({ where: { id: tableId } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "";
    const status = msg === "UNAUTHORIZED" ? 401 : msg === "FORBIDDEN" ? 403 : 400;
    return NextResponse.json({ error: msg || "Erreur" }, { status });
  }
}
