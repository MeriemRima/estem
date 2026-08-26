import Link from "next/link";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const session = await getSession();
  if (session) redirect("/dashboard");

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-6 py-10">
      <header className="flex items-center justify-between">
        <div className="text-2xl font-semibold tracking-tight">Estem</div>
        <div className="flex gap-3">
          <Link href="/login" className="btn">
            Connexion
          </Link>
        </div>
      </header>

      <section className="mt-20 grid gap-10 md:grid-cols-[1.2fr_0.8fr] md:items-end">
        <div>
          <p className="muted mb-3 text-sm uppercase tracking-[0.2em]">SaaS multi-tenant</p>
          <h1 className="max-w-xl text-5xl leading-tight font-semibold md:text-6xl">
            Menu, QR table, cuisine live.
          </h1>
          <p className="muted mt-5 max-w-lg text-lg" style={{ fontFamily: "var(--font-mono)" }}>
            Admin des restaurants · Gérants · Client QR. Devises en DH.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/login" className="btn">
              Se connecter
            </Link>
          </div>
        </div>
        <div className="card space-y-4">
          <div>
            <div className="text-sm muted">Flux</div>
            <ol className="mt-2 space-y-2 text-base" style={{ fontFamily: "var(--font-mono)" }}>
              <li>1. Admin plateforme crée resto + gérant</li>
              <li>2. Gérant configure menu & tables</li>
              <li>3. Générer QR par table</li>
              <li>4. Client commande → cuisine live</li>
            </ol>
          </div>
          <div className="rounded-2xl bg-[rgba(194,65,12,0.08)] p-4 text-sm" style={{ fontFamily: "var(--font-mono)" }}>
            Isolation tenant via <code>organization_id</code> · RBAC · SSE pour le dashboard cuisine
          </div>
        </div>
      </section>
    </main>
  );
}
