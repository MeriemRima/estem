import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireOrgAccess } from "@/lib/auth";

type Params = { params: Promise<{ orgId: string }> };

const itemSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  priceCents: z.number().int().positive(),
  categoryId: z.string().min(1),
  imageUrl: z.string().optional(),
});

export async function POST(request: Request, { params }: Params) {
  try {
    const { orgId } = await params;
    await requireOrgAccess(orgId, ["OWNER", "ADMIN"]);
    const body = itemSchema.parse(await request.json());
    const category = await prisma.category.findFirst({
      where: { id: body.categoryId, organizationId: orgId },
    });
    if (!category) {
      return NextResponse.json({ error: "Catégorie introuvable" }, { status: 404 });
    }
    const item = await prisma.menuItem.create({
      data: {
        name: body.name,
        description: body.description ?? "",
        priceCents: body.priceCents,
        imageUrl: body.imageUrl ?? "",
        categoryId: body.categoryId,
        organizationId: orgId,
      },
    });
    return NextResponse.json(item);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "";
    const status = msg === "UNAUTHORIZED" ? 401 : msg === "FORBIDDEN" ? 403 : 400;
    return NextResponse.json({ error: msg || "Erreur" }, { status });
  }
}
