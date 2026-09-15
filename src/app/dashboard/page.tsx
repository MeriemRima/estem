import { redirect } from "next/navigation";
import { getSession, getUserOrganizations } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { DashboardPicker } from "@/components/dashboard-picker";


export default async function DashboardIndexPage() {
  const user = await getSession();
  if (!user) redirect("/login");

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { mustChangePassword: true },
  });
  if (dbUser?.mustChangePassword) redirect("/account/password");

  if (user.isSuperAdmin) {
    redirect("/super-admin");
  }

  if (user.isVendeur) {
    redirect("/vendeur");
  }

  const memberships = await getUserOrganizations(user.id);

  if (memberships.length === 1) {
    const m = memberships[0];
    if (m.role === "OWNER") {
      redirect(`/dashboard/${m.organizationId}`);
    }
    redirect(`/dashboard/${m.organizationId}/kitchen`);
  }

  return (
    <DashboardPicker
      userName={user.name}
      memberships={memberships.map((m) => ({
        id: m.id,
        role: m.role,
        organizationId: m.organizationId,
        organization: {
          name: m.organization.name,
          slug: m.organization.slug,
        },
      }))}
    />
  );
}

