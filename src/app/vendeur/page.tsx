import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { VendeurPanel } from "@/components/vendeur-panel";


export default async function VendeurPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!session.isVendeur && !session.isSuperAdmin) redirect("/dashboard");

  const dbUser = await prisma.user.findUnique({
    where: { id: session.id },
    select: { mustChangePassword: true },
  });
  if (dbUser?.mustChangePassword) redirect("/account/password");

  const organizations = await prisma.organization.findMany({
    where: session.isSuperAdmin ? {} : { vendeurId: session.id },
    orderBy: { createdAt: "desc" },
    include: {
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
  });

  const totalDishes = organizations.reduce((acc, o) => acc + o._count.items, 0);
  const totalActiveOrders = organizations.reduce((acc, o) => acc + o._count.orders, 0);

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-6 py-8">
      <VendeurPanel
        initialOrgs={organizations.map((o) => ({
          id: o.id,
          name: o.name,
          slug: o.slug,
          createdAt: o.createdAt.toISOString(),
          counts: o._count,
          owner: o.memberships[0]?.user ?? null,
        }))}
        initialStats={{
          restaurants: organizations.length,
          activeOrders: totalActiveOrders,
          dishes: totalDishes,
        }}
        userEmail={session.email}
      />
    </main>
  );
}

