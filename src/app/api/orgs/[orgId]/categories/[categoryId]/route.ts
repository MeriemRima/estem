import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireOrgAccess } from "@/lib/auth";

type Params = { params: Promise<{ orgId: string; categoryId: string }> };

const patchSchema = z.object({
  name: z.string().min(1),
});

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { orgId, categoryId } = await params;
    await requireOrgAccess(orgId, ["OWNER", "ADMIN"]);
    const body = patchSchema.parse(await request.json());
    const existing = await prisma.category.findFirst({
      where: { id: categoryId, organizationId: orgId },
    });
    if (!existing) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
    const category = await prisma.category.update({
      where: { id: categoryId },
      data: { name: body.name },
    });
    return NextResponse.json(category);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "";
    const status = msg === "UNAUTHORIZED" ? 401 : msg === "FORBIDDEN" ? 403 : 400;
    return NextResponse.json({ error: msg || "Erreur" }, { status });
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { orgId, categoryId } = await params;
    await requireOrgAccess(orgId, ["OWNER", "ADMIN"]);
    const existing = await prisma.category.findFirst({
      where: { id: categoryId, organizationId: orgId },
    });
    if (!existing) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
    await prisma.category.delete({ where: { id: categoryId } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "";
    const status = msg === "UNAUTHORIZED" ? 401 : msg === "FORBIDDEN" ? 403 : 400;
    return NextResponse.json({ error: msg || "Erreur" }, { status });
  }
}
