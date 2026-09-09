import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getMembership, getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { KitchenBoard } from "@/components/kitchen-board";
import { LogoutButton } from "@/components/logout-button";
import { RestaurantShell } from "@/components/restaurant-shell";
import { normalizeBranding } from "@/lib/branding";
import { PLATFORM_ROLE_LABEL, roleLabel } from "@/lib/roles";

type Props = { params: Promise<{ orgId: string }> };

export default async function KitchenPage({ params }: Props) {
  const { orgId } = await params;
  const user = await getSession();
  if (!user) redirect("/login");

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { mustChangePassword: true },
  });
  if (dbUser?.mustChangePassword) redirect("/account/password");

  const organization = await prisma.organization.findUnique({ where: { id: orgId } });
  if (!organization) notFound();

  const isVendeurOwner = user.isVendeur && organization.vendeurId === user.id;
  const membership = await getMembership(user.id, orgId);

  if (!membership && !user.isSuperAdmin && !isVendeurOwner) notFound();
  const [orders, pendingOrders] = await Promise.all([
    prisma.order.findMany({
      where: {
        organizationId: orgId,
        status: { in: ["PENDING", "PREPARING", "READY"] },
      },
      include: { items: true, table: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.order.count({
      where: {
        organizationId: orgId,
        status: { in: ["PENDING", "PREPARING", "READY"] },
      },
    }),
  ]);

  const branding = normalizeBranding(organization);
  const displayRole = roleLabel(membership?.role ?? "OWNER", user.isSuperAdmin, isVendeurOwner);

  return (
    <RestaurantShell
      orgId={orgId}
      orgName={organization.name}
      branding={branding}
      active="kitchen"
      backHref={`/dashboard/${orgId}`}
      backLabel="Gestion resto"
      roleLabel={displayRole}
      slug={organization.slug}
      pendingOrders={pendingOrders}
      headerActions={
        <>
          {user.isSuperAdmin ? (
            <Link href="/super-admin" className="btn btn-ghost">
              {PLATFORM_ROLE_LABEL}
            </Link>
          ) : user.isVendeur ? (
            <Link href="/vendeur" className="btn btn-ghost">
              Espace Vendeur
            </Link>
          ) : null}
          <LogoutButton />
        </>
      }
    >
      <KitchenBoard
        orgId={orgId}
        initialOrders={orders}
        restaurantName={organization.name}
      />
    </RestaurantShell>
  );
}
