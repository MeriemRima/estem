import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireOrgAccess } from "@/lib/auth";

type Params = { params: Promise<{ orgId: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const { orgId } = await params;
    await requireOrgAccess(orgId);
    const [categories, tables, pendingOrders, itemCount, orderCount] = await Promise.all([
      prisma.category.findMany({
        where: { organizationId: orgId },
        include: { items: { orderBy: { name: "asc" } } },
        orderBy: { sortOrder: "asc" },
      }),
      prisma.diningTable.findMany({
        where: { organizationId: orgId },
        orderBy: { name: "asc" },
      }),
      prisma.order.count({
        where: {
          organizationId: orgId,
          status: { in: ["PENDING", "PREPARING", "READY"] },
        },
      }),
      prisma.menuItem.count({ where: { organizationId: orgId } }),
      prisma.order.count({ where: { organizationId: orgId } }),
    ]);
    const org = await prisma.organization.findUniqueOrThrow({ where: { id: orgId } });
    return NextResponse.json({
      organization: org,
      categories,
      tables,
      pendingOrders,
      stats: {
        categories: categories.length,
        items: itemCount,
        tables: tables.length,
        orders: orderCount,
        activeOrders: pendingOrders,
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "";
    const status = msg === "UNAUTHORIZED" ? 401 : msg === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ error: msg || "Erreur" }, { status });
  }
}

const patchSchema = z.object({
  name: z.string().min(2).optional(),
  brandName: z.string().optional(),
  logoUrl: z.string().optional(),
  menuCoverUrl: z.string().optional(),
  menuFormat: z.enum(["standard", "book"]).optional(),
  textFont: z.enum(["classic", "elegant", "modern", "soft", "bold"]).optional(),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  backgroundColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  template: z.enum(["classic", "modern", "warm"]).optional(),
});

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { orgId } = await params;
    await requireOrgAccess(orgId, ["OWNER", "ADMIN"]);
    const body = patchSchema.parse(await request.json());
    if (Object.keys(body).length === 0) {
      return NextResponse.json({ error: "Rien à mettre à jour" }, { status: 400 });
    }
    const organization = await prisma.organization.update({
      where: { id: orgId },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.brandName !== undefined ? { brandName: body.brandName } : {}),
        ...(body.logoUrl !== undefined ? { logoUrl: body.logoUrl } : {}),
        ...(body.menuCoverUrl !== undefined ? { menuCoverUrl: body.menuCoverUrl } : {}),
        ...(body.menuFormat !== undefined ? { menuFormat: body.menuFormat } : {}),
        ...(body.textFont !== undefined ? { textFont: body.textFont } : {}),
        ...(body.primaryColor !== undefined ? { primaryColor: body.primaryColor } : {}),
        ...(body.secondaryColor !== undefined ? { secondaryColor: body.secondaryColor } : {}),
        ...(body.backgroundColor !== undefined ? { backgroundColor: body.backgroundColor } : {}),
        ...(body.template !== undefined ? { template: body.template } : {}),
      },
    });
    return NextResponse.json(organization);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "";
    const status = msg === "UNAUTHORIZED" ? 401 : msg === "FORBIDDEN" ? 403 : 400;
    return NextResponse.json({ error: msg || "Erreur" }, { status });
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { orgId } = await params;
    await requireOrgAccess(orgId, ["OWNER"]);
    await prisma.organization.delete({ where: { id: orgId } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "";
    const status = msg === "UNAUTHORIZED" ? 401 : msg === "FORBIDDEN" ? 403 : 400;
    return NextResponse.json({ error: msg || "Erreur" }, { status });
  }
}

const categorySchema = z.object({
  name: z.string().min(1),
});

export async function POST(request: Request, { params }: Params) {
  try {
    const { orgId } = await params;
    await requireOrgAccess(orgId, ["OWNER", "ADMIN"]);
    const body = categorySchema.parse(await request.json());
    const count = await prisma.category.count({ where: { organizationId: orgId } });
    const category = await prisma.category.create({
      data: {
        name: body.name,
        sortOrder: count,
        organizationId: orgId,
      },
    });
    return NextResponse.json(category);
  } catch (error) {
    console.error("POST category:", error);
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Session expirée — reconnecte-toi" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Accès refusé (Owner ou Admin requis)" }, { status: 403 });
    }
    const msg = error instanceof Error ? error.message : "";
    if (/SQLITE|disk|ENOSPC|unable to open database/i.test(msg)) {
      return NextResponse.json(
        { error: "Espace disque insuffisant — libère de l'espace sur ton Mac puis réessaie" },
        { status: 507 },
      );
    }
    return NextResponse.json({ error: msg || "Erreur lors de la création" }, { status: 400 });
  }
}
