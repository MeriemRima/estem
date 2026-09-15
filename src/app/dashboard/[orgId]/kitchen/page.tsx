import { notFound, redirect } from "next/navigation";
import { getMembership, getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { normalizeBranding } from "@/lib/branding";
import { KitchenView } from "@/components/kitchen-view";

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
  const role = membership?.role ?? "OWNER";

  return (
    <KitchenView
      orgId={orgId}
      orgName={organization.name}
      branding={branding}
      slug={organization.slug}
      role={role}
      isPlatformAdmin={user.isSuperAdmin}
      isVendeur={Boolean(user.isVendeur)}
      initialOrders={orders}
      pendingOrders={pendingOrders}
    />
  );
}

