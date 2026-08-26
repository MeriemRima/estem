"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Owner = {
  id: string;
  name: string;
  email: string;
  mustChangePassword: boolean;
} | null;

type OrgRow = {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  counts: {
    memberships: number;
    items: number;
    tables: number;
    orders: number;
  };
  owner: Owner;
};

type Stats = {
  restaurants: number;
  users: number;
  activeOrders: number;
};

function suggestPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < 10; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export function SuperAdminPanel({
  initialOrgs,
  initialStats,
}: {
  initialOrgs: OrgRow[];
  initialStats: Stats;
}) {
  const router = useRouter();
  const [orgs, setOrgs] = useState(initialOrgs);
  const [stats, setStats] = useState(initialStats);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [provisionalPassword, setProvisionalPassword] = useState(suggestPassword);
  const [createdCred, setCreatedCred] = useState<{
    restaurant: string;
    email: string;
    password: string;
    orgId: string;
  } | null>(null);
  const [resetCred, setResetCred] = useState<{
    restaurant: string;
    email: string;
    password: string;
  } | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return orgs;
    return orgs.filter(
      (o) =>
        o.name.toLowerCase().includes(q) ||
        o.slug.toLowerCase().includes(q) ||
        o.owner?.email?.toLowerCase().includes(q) ||
        o.owner?.name?.toLowerCase().includes(q),
    );
  }, [orgs, query]);

  async function refresh() {
    const res = await fetch("/api/super-admin");
    if (!res.ok) return;
    const data = await res.json();
    setStats(data.stats);
    setOrgs(
      data.organizations.map(
        (o: {
          id: string;
          name: string;
          slug: string;
          createdAt: string;
          _count: OrgRow["counts"];
          owner: Owner;
        }) => ({
          id: o.id,
          name: o.name,
          slug: o.slug,
          createdAt: o.createdAt,
          counts: o._count,
          owner: o.owner,
        }),
      ),
    );
  }

  async function createRestaurant(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setCreatedCred(null);
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    const password = String(form.get("ownerPassword") || provisionalPassword);
    try {
      const res = await fetch("/api/super-admin/restaurants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurantName: form.get("restaurantName"),
          ownerName: form.get("ownerName"),
          ownerEmail: form.get("ownerEmail"),
          ownerPassword: password,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Erreur");
        return;
      }
      setCreatedCred({
        restaurant: data.name,
        email: data.owner?.email ?? String(form.get("ownerEmail")),
        password,
        orgId: data.id,
      });
      formEl.reset();
      setProvisionalPassword(suggestPassword());
      await refresh();
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function removeOrg(id: string, name: string) {
    if (!window.confirm(`Supprimer « ${name} » de la plateforme ?`)) return;
    const res = await fetch(`/api/super-admin/restaurants/${id}`, { method: "DELETE" });
    if (!res.ok) {
      setError("Suppression impossible");
      return;
    }
    await refresh();
  }

  async function resetOwnerPassword(org: OrgRow) {
    if (!org.owner) {
      setError("Aucun gérant à réinitialiser");
      return;
    }
    if (!window.confirm(`Nouveau mot de passe provisoire pour ${org.owner.email} ?`)) return;
    setError("");
    const res = await fetch(`/api/super-admin/restaurants/${org.id}/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Réinitialisation impossible");
      return;
    }
    setResetCred({
      restaurant: org.name,
      email: data.email,
      password: data.provisionalPassword,
    });
    await refresh();
  }

  return (
    <div className="space-y-8">
      <section className="grid gap-3 sm:grid-cols-3">
        {[
          ["Restaurants", stats.restaurants, "Créés sur la plateforme"],
          ["Comptes", stats.users, "Gérants & équipes"],
          ["Commandes live", stats.activeOrders, "En cours partout"],
        ].map(([label, value, hint]) => (
          <div
            key={label as string}
            className="relative overflow-hidden rounded-[1.35rem] border border-[var(--line)] bg-[var(--card)] p-5"
          >
            <div
              className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-30"
              style={{ background: "radial-gradient(circle, rgba(194,65,12,0.35), transparent 70%)" }}
            />
            <div className="muted text-xs uppercase tracking-[0.16em]">{label}</div>
            <div className="mt-2 text-3xl font-semibold tabular-nums">{value}</div>
            <p className="muted mt-1 text-xs" style={{ fontFamily: "var(--font-mono)" }}>
              {hint}
            </p>
          </div>
        ))}
      </section>

      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <form
          onSubmit={createRestaurant}
          className="space-y-4 rounded-[1.5rem] border border-[var(--line)] bg-[var(--card)] p-5 shadow-[0_12px_40px_rgba(28,25,23,0.06)]"
        >
          <div>
            <p className="muted text-xs uppercase tracking-[0.16em]">Accès gérant</p>
            <h2 className="mt-1 text-2xl font-semibold">Créer un restaurant</h2>
            <p className="muted mt-1 text-sm" style={{ fontFamily: "var(--font-mono)" }}>
              Le gérant n&apos;accède qu&apos;à son espace, avec un mot de passe provisoire à
              changer à la 1<sup>re</sup> connexion.
            </p>
          </div>

          <input className="input" name="restaurantName" placeholder="Nom du restaurant" required />
          <input className="input" name="ownerName" placeholder="Nom du gérant" required />
          <input
            className="input"
            name="ownerEmail"
            type="email"
            placeholder="Email du gérant"
            required
          />
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <label className="label mb-0" htmlFor="ownerPassword">
                Mot de passe provisoire
              </label>
              <button
                type="button"
                className="text-xs font-semibold underline opacity-70"
                onClick={() => setProvisionalPassword(suggestPassword())}
              >
                Générer
              </button>
            </div>
            <input
              className="input"
              id="ownerPassword"
              name="ownerPassword"
              type="text"
              value={provisionalPassword}
              onChange={(e) => setProvisionalPassword(e.target.value)}
              minLength={6}
              required
              autoComplete="off"
              style={{ fontFamily: "var(--font-mono)" }}
            />
          </div>

          {error ? <p className="text-sm text-red-700">{error}</p> : null}

          {createdCred ? (
            <div
              className="rounded-2xl border px-4 py-3 text-sm"
              style={{
                borderColor: "color-mix(in srgb, var(--ok) 40%, var(--line))",
                background: "color-mix(in srgb, var(--ok) 8%, white)",
              }}
            >
              <div className="font-semibold">Compte gérant créé</div>
              <p className="mt-1 opacity-80" style={{ fontFamily: "var(--font-mono)" }}>
                {createdCred.restaurant}
                <br />
                {createdCred.email}
                <br />
                MDP : {createdCred.password}
              </p>
              <Link href={`/dashboard/${createdCred.orgId}`} className="btn mt-3">
                Ouvrir le restaurant
              </Link>
            </div>
          ) : null}

          <button className="btn w-full" disabled={loading}>
            {loading ? "Création..." : "Créer resto + compte gérant"}
          </button>
        </form>

        <section className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="muted text-xs uppercase tracking-[0.16em]">Ownership</p>
              <h2 className="text-2xl font-semibold">Tous les restaurants</h2>
            </div>
            <input
              className="input max-w-xs"
              placeholder="Rechercher resto ou gérant…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          {filtered.length === 0 ? (
            <div className="rounded-[1.35rem] border border-dashed border-[var(--line)] bg-[var(--card)] p-8 text-center">
              <p className="muted">Aucun restaurant trouvé.</p>
            </div>
          ) : null}

          {resetCred ? (
            <div
              className="rounded-2xl border px-4 py-3 text-sm"
              style={{
                borderColor: "color-mix(in srgb, var(--ok) 40%, var(--line))",
                background: "color-mix(in srgb, var(--ok) 8%, white)",
              }}
            >
              <div className="font-semibold">Nouveau MDP provisoire</div>
              <p className="mt-1 opacity-80" style={{ fontFamily: "var(--font-mono)" }}>
                {resetCred.restaurant}
                <br />
                {resetCred.email}
                <br />
                MDP : {resetCred.password}
              </p>
            </div>
          ) : null}

          <div className="space-y-3">
            {filtered.map((org) => (
              <article
                key={org.id}
                className="rounded-[1.35rem] border border-[var(--line)] bg-[var(--card)] p-4 transition hover:border-[var(--brand)]"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-lg font-semibold">{org.name}</h3>
                    <p className="muted text-sm" style={{ fontFamily: "var(--font-mono)" }}>
                      /{org.slug} · {org.counts.items} plats · {org.counts.tables} tables ·{" "}
                      {org.counts.orders} cmd
                    </p>
                    <div className="mt-3 rounded-xl bg-[rgba(194,65,12,0.06)] px-3 py-2 text-sm">
                      <div className="text-xs uppercase tracking-[0.14em] opacity-55">Gérant</div>
                      {org.owner ? (
                        <div className="mt-0.5">
                          <span className="font-semibold">{org.owner.name}</span>
                          <span className="muted"> · {org.owner.email}</span>
                          {org.owner.mustChangePassword ? (
                            <span className="ml-2 text-xs font-semibold text-amber-800">
                              MDP provisoire
                            </span>
                          ) : null}
                        </div>
                      ) : (
                        <div className="muted mt-0.5">Aucun gérant assigné</div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link href={`/dashboard/${org.id}`} className="btn btn-ghost">
                      Voir le restaurant
                    </Link>
                    {org.owner ? (
                      <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={() => resetOwnerPassword(org)}
                      >
                        Reset MDP
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => removeOrg(org.id, org.name)}
                    >
                      Supprimer
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
