import { notFound, redirect } from "next/navigation";
import { getSession, getMembership } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { OrgDashboard } from "@/components/org-dashboard";
import { normalizeBranding } from "@/lib/branding";
import type { RestaurantNavId } from "@/components/restaurant-shell";
import { PLATFORM_ROLE_LABEL, roleLabel } from "@/lib/roles";

type Props = {
  params: Promise<{ orgId: string }>;
  searchParams: Promise<{ tab?: string }>;
};

export default async function OrgDashboardPage({ params, searchParams }: Props) {
  const { orgId } = await params;
  const { tab } = await searchParams;
  const user = await getSession();
  if (!user) redirect("/login");

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { mustChangePassword: true },
  });
  if (dbUser?.mustChangePassword) redirect("/account/password");

  const membership = await getMembership(user.id, orgId);
  if (!membership && !user.isSuperAdmin) notFound();

  const role = user.isSuperAdmin ? "OWNER" : membership!.role;

  const [organization, categories, tables, pendingOrders, itemCount, orderCount] =
    await Promise.all([
      prisma.organization.findUniqueOrThrow({ where: { id: orgId } }),
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

  const branding = normalizeBranding(organization);
  const allowed: RestaurantNavId[] = ["admin", "menu", "tables", "settings"];
  const initialTab = allowed.includes(tab as RestaurantNavId)
    ? (tab as RestaurantNavId)
    : "admin";

  return (
    <OrgDashboard
      orgId={orgId}
      orgName={organization.name}
      slug={organization.slug}
      role={role}
      initialCategories={categories}
      initialTables={tables}
      initialStats={{
        categories: categories.length,
        items: itemCount,
        tables: tables.length,
        orders: orderCount,
        activeOrders: pendingOrders,
      }}
      initialBranding={branding}
      backHref={user.isSuperAdmin ? "/super-admin" : undefined}
      backLabel={user.isSuperAdmin ? PLATFORM_ROLE_LABEL : undefined}
      roleLabel={roleLabel(role, user.isSuperAdmin)}
      initialTab={initialTab}
    />
  );
}
