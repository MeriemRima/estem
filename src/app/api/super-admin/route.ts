import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/auth";

export async function GET() {
  try {
    await requireSuperAdmin();
    const [organizations, users, orders] = await Promise.all([
      prisma.organization.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          _count: {
            select: {
              memberships: true,
              items: true,
              tables: true,
              orders: true,
            },
          },
          memberships: {
            where: { role: "OWNER" },
            take: 1,
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  mustChangePassword: true,
                },
              },
            },
          },
        },
      }),
      prisma.user.count(),
      prisma.order.count({
        where: { status: { in: ["PENDING", "PREPARING", "READY"] } },
      }),
    ]);
    return NextResponse.json({
      stats: {
        restaurants: organizations.length,
        users,
        activeOrders: orders,
      },
      organizations: organizations.map((o) => {
        const owner = o.memberships[0]?.user ?? null;
        return {
          id: o.id,
          name: o.name,
          slug: o.slug,
          createdAt: o.createdAt,
          _count: o._count,
          owner,
        };
      }),
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "";
    const status = msg === "UNAUTHORIZED" ? 401 : msg === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ error: msg || "Erreur" }, { status });
  }
}
