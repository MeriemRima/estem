import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { LogoutButton } from "@/components/logout-button";
import { SuperAdminPanel } from "@/components/super-admin-panel";
import { PLATFORM_ROLE_LABEL } from "@/lib/roles";

export default async function SuperAdminPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!session.isSuperAdmin) redirect("/dashboard");

  const dbUser = await prisma.user.findUnique({
    where: { id: session.id },
    select: { mustChangePassword: true },
  });
  if (dbUser?.mustChangePassword) redirect("/account/password");

  const [organizations, userCount, activeOrders] = await Promise.all([
    prisma.organization.findMany({
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
    }),
    prisma.user.count(),
    prisma.order.count({
      where: { status: { in: ["PENDING", "PREPARING", "READY"] } },
    }),
  ]);

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-6 py-8">
      <header className="mb-10 overflow-hidden rounded-[1.75rem] border border-[var(--line)] bg-[var(--card)] px-6 py-7 shadow-[0_16px_48px_rgba(28,25,23,0.07)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="muted text-sm uppercase tracking-[0.22em]">Plateforme Estem</p>
            <h1 className="mt-1 text-4xl font-semibold tracking-tight">{PLATFORM_ROLE_LABEL}</h1>
            <p className="muted mt-2 max-w-xl text-sm" style={{ fontFamily: "var(--font-mono)" }}>
              Crée les restaurants, assigne les gérants, suis l&apos;ownership. Les gérants
              n&apos;entrent que dans leur propre espace.
            </p>
            <p className="muted mt-3 text-xs" style={{ fontFamily: "var(--font-mono)" }}>
              Connecté · {session.email}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <LogoutButton />
          </div>
        </div>
      </header>
      <SuperAdminPanel
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
          users: userCount,
          activeOrders,
        }}
      />
    </main>
  );
}
