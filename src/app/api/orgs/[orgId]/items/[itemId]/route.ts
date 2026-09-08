import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireOrgAccess } from "@/lib/auth";

type Params = { params: Promise<{ orgId: string; itemId: string }> };

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  priceCents: z.number().int().positive().optional(),
  categoryId: z.string().min(1).optional(),
  available: z.boolean().optional(),
  imageUrl: z.string().optional(),
});

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { orgId, itemId } = await params;
    await requireOrgAccess(orgId, ["OWNER", "ADMIN"]);
    const body = patchSchema.parse(await request.json());
    const existing = await prisma.menuItem.findFirst({
      where: { id: itemId, organizationId: orgId },
    });
    if (!existing) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

    if (body.categoryId) {
      const category = await prisma.category.findFirst({
        where: { id: body.categoryId, organizationId: orgId },
      });
      if (!category) return NextResponse.json({ error: "Catégorie invalide" }, { status: 400 });
    }

    const item = await prisma.menuItem.update({
      where: { id: itemId },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.description !== undefined ? { description: body.description } : {}),
        ...(body.priceCents !== undefined ? { priceCents: body.priceCents } : {}),
        ...(body.categoryId !== undefined ? { categoryId: body.categoryId } : {}),
        ...(body.available !== undefined ? { available: body.available } : {}),
        ...(body.imageUrl !== undefined ? { imageUrl: body.imageUrl } : {}),
      },
    });
    return NextResponse.json(item);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "";
    const status = msg === "UNAUTHORIZED" ? 401 : msg === "FORBIDDEN" ? 403 : 400;
    return NextResponse.json({ error: msg || "Erreur" }, { status });
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { orgId, itemId } = await params;
    await requireOrgAccess(orgId, ["OWNER", "ADMIN"]);
    const existing = await prisma.menuItem.findFirst({
      where: { id: itemId, organizationId: orgId },
    });
    if (!existing) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
    await prisma.menuItem.delete({ where: { id: itemId } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "";
    const status = msg === "UNAUTHORIZED" ? 401 : msg === "FORBIDDEN" ? 403 : 400;
    return NextResponse.json({ error: msg || "Erreur" }, { status });
  }
}
