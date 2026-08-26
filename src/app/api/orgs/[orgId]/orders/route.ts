import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireOrgAccess } from "@/lib/auth";
import { publishOrderEvent } from "@/lib/order-events";

type Params = { params: Promise<{ orgId: string }> };

export async function GET(request: Request, { params }: Params) {
  try {
    const { orgId } = await params;
    await requireOrgAccess(orgId);
    const { searchParams } = new URL(request.url);
    const active = searchParams.get("active") === "1";
    const orders = await prisma.order.findMany({
      where: {
        organizationId: orgId,
        ...(active
          ? { status: { in: ["PENDING", "PREPARING", "READY"] } }
          : {}),
      },
      include: {
        items: true,
        table: true,
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return NextResponse.json(orders);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "";
    const status = msg === "UNAUTHORIZED" ? 401 : msg === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ error: msg || "Erreur" }, { status });
  }
}

const statusSchema = z.object({
  orderId: z.string(),
  status: z.enum(["PENDING", "PREPARING", "READY", "COMPLETED", "CANCELLED"]),
});

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { orgId } = await params;
    await requireOrgAccess(orgId);
    const body = statusSchema.parse(await request.json());
    const order = await prisma.order.findFirst({
      where: { id: body.orderId, organizationId: orgId },
    });
    if (!order) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
    const updated = await prisma.order.update({
      where: { id: order.id },
      data: { status: body.status },
      include: { items: true, table: true },
    });
    publishOrderEvent(orgId);
    return NextResponse.json(updated);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "";
    const status = msg === "UNAUTHORIZED" ? 401 : msg === "FORBIDDEN" ? 403 : 400;
    return NextResponse.json({ error: msg || "Erreur" }, { status });
  }
}
