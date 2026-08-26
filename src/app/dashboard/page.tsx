import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession, getUserOrganizations } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { LogoutButton } from "@/components/logout-button";
import { roleLabel } from "@/lib/roles";

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

  const memberships = await getUserOrganizations(user.id);

  if (memberships.length === 1) {
    const m = memberships[0];
    if (m.role === "OWNER") {
      redirect(`/dashboard/${m.organizationId}`);
    }
    redirect(`/dashboard/${m.organizationId}/kitchen`);
  }

  const empty = memberships.length === 0;

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-6 py-10">
      <header className="mb-10 flex items-center justify-between">
        <div>
          <div className="text-2xl font-semibold">Estem</div>
          <p className="muted" style={{ fontFamily: "var(--font-mono)" }}>
            Bonjour {user.name}
          </p>
        </div>
        <LogoutButton />
      </header>

      {empty ? (
        <section className="space-y-4">
          <h1 className="text-3xl font-semibold">Aucun restaurant</h1>
          <p className="muted max-w-md" style={{ fontFamily: "var(--font-mono)" }}>
            Ton compte n&apos;est lié à aucun restaurant. Demande à l&apos;admin des restaurants
            de te créer un accès gérant.
          </p>
        </section>
      ) : (
        <section>
          <h1 className="mb-6 text-3xl font-semibold">Ton espace</h1>
          <div className="grid gap-3">
            {memberships.map((m) => (
              <div key={m.id} className="card">
                <div className="text-xl font-semibold">{m.organization.name}</div>
                <div className="muted text-sm" style={{ fontFamily: "var(--font-mono)" }}>
                  {roleLabel(m.role)} · /{m.organization.slug}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link href={`/dashboard/${m.organizationId}/kitchen`} className="btn">
                    Voir les commandes
                  </Link>
                  {(m.role === "OWNER" || m.role === "ADMIN") && (
                    <Link href={`/dashboard/${m.organizationId}`} className="btn btn-ghost">
                      Gérer le resto
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
