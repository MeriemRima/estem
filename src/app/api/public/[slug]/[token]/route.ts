import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { publishOrderEvent } from "@/lib/order-events";

type Params = { params: Promise<{ slug: string; token: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { slug, token } = await params;
  const table = await prisma.diningTable.findFirst({
    where: {
      token,
      organization: { slug },
    },
    include: {
      organization: {
        include: {
          categories: {
            orderBy: { sortOrder: "asc" },
            include: {
              items: {
                where: { available: true },
                orderBy: { name: "asc" },
              },
            },
          },
        },
      },
    },
  });
  if (!table) return NextResponse.json({ error: "Table introuvable" }, { status: 404 });
  return NextResponse.json({
    table: { id: table.id, name: table.name },
    organization: {
      id: table.organization.id,
      name: table.organization.name,
      slug: table.organization.slug,
    },
    categories: table.organization.categories,
  });
}

const orderSchema = z.object({
  note: z.string().optional(),
  items: z
    .array(
      z.object({
        menuItemId: z.string(),
        quantity: z.number().int().positive(),
      }),
    )
    .min(1),
});

export async function POST(request: Request, { params }: Params) {
  try {
    const { slug, token } = await params;
    const body = orderSchema.parse(await request.json());
    const table = await prisma.diningTable.findFirst({
      where: { token, organization: { slug } },
      include: { organization: true },
    });
    if (!table) return NextResponse.json({ error: "Table introuvable" }, { status: 404 });

    const menuItems = await prisma.menuItem.findMany({
      where: {
        organizationId: table.organizationId,
        id: { in: body.items.map((i) => i.menuItemId) },
        available: true,
      },
    });
    if (menuItems.length !== body.items.length) {
      return NextResponse.json({ error: "Articles invalides" }, { status: 400 });
    }

    const byId = new Map(menuItems.map((m) => [m.id, m]));
    let totalCents = 0;
    const lines = body.items.map((line) => {
      const item = byId.get(line.menuItemId)!;
      totalCents += item.priceCents * line.quantity;
      return {
        name: item.name,
        unitPriceCents: item.priceCents,
        quantity: line.quantity,
        menuItemId: item.id,
      };
    });

    const order = await prisma.order.create({
      data: {
        organizationId: table.organizationId,
        tableId: table.id,
        source: "QR",
        status: "PENDING",
        totalCents,
        note: body.note ?? "",
        items: { create: lines },
      },
      include: { items: true, table: true },
    });

    publishOrderEvent(table.organizationId);
    return NextResponse.json(order);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Commande invalide" }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
