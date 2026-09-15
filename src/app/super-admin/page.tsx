import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { SuperAdminPanel } from "@/components/super-admin-panel";


export default async function SuperAdminPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!session.isSuperAdmin) redirect("/dashboard");

  const dbUser = await prisma.user.findUnique({
    where: { id: session.id },
    select: { mustChangePassword: true },
  });
  if (dbUser?.mustChangePassword) redirect("/account/password");

  const [organizations, userCount, activeOrders, allUsers, vendeurs] = await Promise.all([
    prisma.organization.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        vendeur: {
          select: { id: true, name: true, email: true },
        },
        _count: {
          select: { memberships: true, items: true, tables: true, orders: true },
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
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        isSuperAdmin: true,
        mustChangePassword: true,
        createdAt: true,
        memberships: {
          select: {
            role: true,
            organization: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
      },
    }),
    prisma.user.findMany({
      where: { isVendeur: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
        mustChangePassword: true,
        createdAt: true,
        _count: { select: { vendeurOrganizations: true } },
      },
    }),
  ]);

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-6 py-8">
      <SuperAdminPanel
        initialOrgs={organizations.map((o) => ({
          id: o.id,
          name: o.name,
          slug: o.slug,
          createdAt: o.createdAt.toISOString(),
          vendeurId: o.vendeurId,
          vendeur: o.vendeur,
          counts: o._count,
          owner: o.memberships[0]?.user ?? null,
        }))}
        initialUsers={allUsers.map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          isSuperAdmin: u.isSuperAdmin,
          mustChangePassword: u.mustChangePassword,
          createdAt: u.createdAt.toISOString(),
          memberships: u.memberships,
        }))}
        initialVendeurs={vendeurs.map((v) => ({
          ...v,
          createdAt: v.createdAt.toISOString(),
        }))}
        currentUserId={session.id}
        userEmail={session.email}
        initialStats={{
          restaurants: organizations.length,
          users: userCount,
          activeOrders,
          vendeursCount: vendeurs.length,
        }}
      />
    </main>
  );
}

