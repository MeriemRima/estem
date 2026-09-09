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

type Vendeur = {
  id: string;
  name: string;
  email: string;
  mustChangePassword: boolean;
  createdAt: string;
  _count: {
    vendeurOrganizations: number;
  };
};

type OrgRow = {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  vendeurId?: string | null;
  vendeur?: { id: string; name: string; email: string } | null;
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
  vendeursCount?: number;
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
  initialVendeurs = [],
}: {
  initialOrgs: OrgRow[];
  initialStats: Stats;
  initialVendeurs?: Vendeur[];
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"vendeurs" | "restaurants">("vendeurs");
  const [orgs, setOrgs] = useState(initialOrgs);
  const [vendeurs, setVendeurs] = useState(initialVendeurs);
  const [stats, setStats] = useState(initialStats);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  
  // Vendeur creation state
  const [vendeurPassword, setVendeurPassword] = useState(suggestPassword);
  const [createdVendeurCred, setCreatedVendeurCred] = useState<{
    name: string;
    email: string;
    password: string;
  } | null>(null);

  // Restaurant creation state
  const [provisionalPassword, setProvisionalPassword] = useState(suggestPassword);
  const [createdCred, setCreatedCred] = useState<{
    restaurant: string;
    email: string;
    password: string;
    orgId: string;
  } | null>(null);

  const [resetCred, setResetCred] = useState<{
    target: string;
    email: string;
    password: string;
  } | null>(null);

  const filteredOrgs = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return orgs;
    return orgs.filter(
      (o) =>
        o.name.toLowerCase().includes(q) ||
        o.slug.toLowerCase().includes(q) ||
        o.owner?.email?.toLowerCase().includes(q) ||
        o.owner?.name?.toLowerCase().includes(q) ||
        o.vendeur?.name?.toLowerCase().includes(q) ||
        o.vendeur?.email?.toLowerCase().includes(q),
    );
  }, [orgs, query]);

  const filteredVendeurs = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return vendeurs;
    return vendeurs.filter(
      (v) =>
        v.name.toLowerCase().includes(q) ||
        v.email.toLowerCase().includes(q),
    );
  }, [vendeurs, query]);

  async function refresh() {
    const res = await fetch("/api/super-admin");
    if (!res.ok) return;
    const data = await res.json();
    setStats(data.stats);
    setVendeurs(data.vendeurs || []);
    setOrgs(
      data.organizations.map(
        (o: {
          id: string;
          name: string;
          slug: string;
          createdAt: string;
          vendeurId?: string | null;
          vendeur?: { id: string; name: string; email: string } | null;
          _count: OrgRow["counts"];
          owner: Owner;
        }) => ({
          id: o.id,
          name: o.name,
          slug: o.slug,
          createdAt: o.createdAt,
          vendeurId: o.vendeurId,
          vendeur: o.vendeur,
          counts: o._count,
          owner: o.owner,
        }),
      ),
    );
  }

  async function createVendeur(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setCreatedVendeurCred(null);
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    const password = String(form.get("vendeurPassword") || vendeurPassword);

    try {
      const res = await fetch("/api/super-admin/vendeurs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.get("name"),
          email: form.get("email"),
          password,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Erreur");
        return;
      }
      setCreatedVendeurCred({
        name: data.vendeur.name,
        email: data.vendeur.email,
        password: data.provisionalPassword,
      });
      formEl.reset();
      setVendeurPassword(suggestPassword());
      await refresh();
    } finally {
      setLoading(false);
    }
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

  async function removeVendeur(id: string, name: string) {
    if (!window.confirm(`Supprimer le compte vendeur « ${name} » ? Ses restaurants seront conservés.`)) return;
    const res = await fetch(`/api/super-admin/vendeurs/${id}`, { method: "DELETE" });
    if (!res.ok) {
      setError("Suppression impossible");
      return;
    }
    await refresh();
  }

  async function resetVendeurPassword(vendeur: Vendeur) {
    if (!window.confirm(`Nouveau mot de passe provisoire pour ${vendeur.email} ?`)) return;
    setError("");
    const res = await fetch(`/api/super-admin/vendeurs/${vendeur.id}`, {
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
      target: `Vendeur ${vendeur.name}`,
      email: data.email,
      password: data.provisionalPassword,
    });
    await refresh();
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
      target: org.name,
      email: data.email,
      password: data.provisionalPassword,
    });
    await refresh();
  }

  return (
    <div className="space-y-8">
      {/* Platform Stats Header */}
      <section className="grid gap-3 sm:grid-cols-4">
        {[
          ["Account Managers (Vendeurs)", stats.vendeursCount ?? vendeurs.length, "Gestionnaires de portefeuille"],
          ["Restaurants", stats.restaurants, "Créés sur la plateforme"],
          ["Comptes Globaux", stats.users, "Vendeurs, gérants & équipes"],
          ["Commandes live", stats.activeOrders, "En cours en cuisine"],
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

      {/* Navigation Tabs */}
      <div className="flex border-b border-[var(--line)] gap-6 text-sm font-semibold">
        <button
          className={`pb-3 border-b-2 transition ${
            activeTab === "vendeurs"
              ? "border-[var(--brand)] text-[var(--brand)]"
              : "border-transparent text-gray-500 hover:text-gray-900"
          }`}
          onClick={() => setActiveTab("vendeurs")}
        >
          Gestion des Vendeurs ({vendeurs.length})
        </button>
        <button
          className={`pb-3 border-b-2 transition ${
            activeTab === "restaurants"
              ? "border-[var(--brand)] text-[var(--brand)]"
              : "border-transparent text-gray-500 hover:text-gray-900"
          }`}
          onClick={() => setActiveTab("restaurants")}
        >
          Tous les Restaurants ({orgs.length})
        </button>
      </div>

      {resetCred ? (
        <div
          className="rounded-2xl border px-4 py-3 text-sm"
          style={{
            borderColor: "color-mix(in srgb, var(--ok) 40%, var(--line))",
            background: "color-mix(in srgb, var(--ok) 8%, white)",
          }}
        >
          <div className="font-semibold">Mot de passe réinitialisé pour {resetCred.target}</div>
          <p className="mt-1 opacity-80" style={{ fontFamily: "var(--font-mono)" }}>
            Email : {resetCred.email}
            <br />
            MDP Provisoire : {resetCred.password}
          </p>
        </div>
      ) : null}

      {/* TAB 1: VENDEURS */}
      {activeTab === "vendeurs" && (
        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          {/* Create Vendeur Form */}
          <form
            onSubmit={createVendeur}
            className="space-y-4 rounded-[1.5rem] border border-[var(--line)] bg-[var(--card)] p-5 shadow-[0_12px_40px_rgba(28,25,23,0.06)]"
          >
            <div>
              <p className="muted text-xs uppercase tracking-[0.16em]">Nouveau Partenaire</p>
              <h2 className="mt-1 text-2xl font-semibold">Créer un Vendeur</h2>
              <p className="muted mt-1 text-sm" style={{ fontFamily: "var(--font-mono)" }}>
                Un Account Manager (Vendeur) peut créer ses propres restaurants et leur assigner des gérants.
              </p>
            </div>

            <input className="input" name="name" placeholder="Nom du vendeur" required />
            <input className="input" name="email" type="email" placeholder="Email professionnel" required />

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label className="label mb-0" htmlFor="vendeurPassword">
                  Mot de passe provisoire
                </label>
                <button
                  type="button"
                  className="text-xs font-semibold underline opacity-70"
                  onClick={() => setVendeurPassword(suggestPassword())}
                >
                  Générer
                </button>
              </div>
              <input
                className="input"
                id="vendeurPassword"
                name="vendeurPassword"
                type="text"
                value={vendeurPassword}
                onChange={(e) => setVendeurPassword(e.target.value)}
                minLength={6}
                required
                autoComplete="off"
                style={{ fontFamily: "var(--font-mono)" }}
              />
            </div>

            {error ? <p className="text-sm text-red-700">{error}</p> : null}

            {createdVendeurCred ? (
              <div
                className="rounded-2xl border px-4 py-3 text-sm space-y-1"
                style={{
                  borderColor: "color-mix(in srgb, var(--ok) 40%, var(--line))",
                  background: "color-mix(in srgb, var(--ok) 8%, white)",
                }}
              >
                <div className="font-semibold">Compte Vendeur créé !</div>
                <p className="opacity-80" style={{ fontFamily: "var(--font-mono)" }}>
                  {createdVendeurCred.name}
                  <br />
                  Email : {createdVendeurCred.email}
                  <br />
                  MDP : {createdVendeurCred.password}
                </p>
              </div>
            ) : null}

            <button className="btn w-full" disabled={loading}>
              {loading ? "Création..." : "Créer le compte Vendeur"}
            </button>
          </form>

          {/* Vendeurs List */}
          <section className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="muted text-xs uppercase tracking-[0.16em]">Portefeuille Vendeurs</p>
                <h2 className="text-2xl font-semibold">Tous les Vendeurs</h2>
              </div>
              <input
                className="input max-w-xs"
                placeholder="Rechercher vendeur…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>

            {filteredVendeurs.length === 0 ? (
              <div className="rounded-[1.35rem] border border-dashed border-[var(--line)] bg-[var(--card)] p-8 text-center">
                <p className="muted">Aucun vendeur trouvé.</p>
              </div>
            ) : null}

            <div className="space-y-3">
              {filteredVendeurs.map((v) => (
                <article
                  key={v.id}
                  className="rounded-[1.35rem] border border-[var(--line)] bg-[var(--card)] p-4 transition hover:border-[var(--brand)]"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold">{v.name}</h3>
                        <span className="rounded-full bg-orange-100 text-orange-800 text-xs px-2.5 py-0.5 font-semibold">
                          Vendeur
                        </span>
                      </div>
                      <p className="muted text-sm" style={{ fontFamily: "var(--font-mono)" }}>
                        {v.email} · {v._count.vendeurOrganizations} restaurant(s) créé(s)
                      </p>
                      {v.mustChangePassword ? (
                        <p className="text-xs text-amber-800 font-semibold mt-1">
                          (En attente de 1re connexion / changement MDP)
                        </p>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="btn btn-ghost text-xs"
                        onClick={() => resetVendeurPassword(v)}
                      >
                        Reset MDP
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost text-xs text-red-600"
                        onClick={() => removeVendeur(v.id, v.name)}
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
      )}

      {/* TAB 2: RESTAURANTS */}
      {activeTab === "restaurants" && (
        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <form
            onSubmit={createRestaurant}
            className="space-y-4 rounded-[1.5rem] border border-[var(--line)] bg-[var(--card)] p-5 shadow-[0_12px_40px_rgba(28,25,23,0.06)]"
          >
            <div>
              <p className="muted text-xs uppercase tracking-[0.16em]">Direct SuperAdmin</p>
              <h2 className="mt-1 text-2xl font-semibold">Créer un restaurant</h2>
              <p className="muted mt-1 text-sm" style={{ fontFamily: "var(--font-mono)" }}>
                Crée directement un restaurant avec son gérant d&apos;exploitation.
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
                <p className="muted text-xs uppercase tracking-[0.16em]">Ownership Global</p>
                <h2 className="text-2xl font-semibold">Tous les restaurants</h2>
              </div>
              <input
                className="input max-w-xs"
                placeholder="Rechercher resto, gérant ou vendeur…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>

            {filteredOrgs.length === 0 ? (
              <div className="rounded-[1.35rem] border border-dashed border-[var(--line)] bg-[var(--card)] p-8 text-center">
                <p className="muted">Aucun restaurant trouvé.</p>
              </div>
            ) : null}

            <div className="space-y-3">
              {filteredOrgs.map((org) => (
                <article
                  key={org.id}
                  className="rounded-[1.35rem] border border-[var(--line)] bg-[var(--card)] p-4 transition hover:border-[var(--brand)]"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-lg font-semibold">{org.name}</h3>
                        {org.vendeur ? (
                          <span className="text-xs bg-amber-50 text-amber-900 border border-amber-200 px-2 py-0.5 rounded-full">
                            Vendeur : {org.vendeur.name}
                          </span>
                        ) : (
                          <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">
                            SuperAdmin direct
                          </span>
                        )}
                      </div>
                      <p className="muted text-sm mt-1" style={{ fontFamily: "var(--font-mono)" }}>
                        /{org.slug} · {org.counts.items} plats · {org.counts.tables} tables ·{" "}
                        {org.counts.orders} cmd
                      </p>
                      <div className="mt-3 rounded-xl bg-[rgba(194,65,12,0.06)] px-3 py-2 text-sm">
                        <div className="text-xs uppercase tracking-[0.14em] opacity-55">Gérant (Exploitation)</div>
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
                          <div className="muted mt-0.5 text-xs">Aucun gérant assigné</div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Link href={`/dashboard/${org.id}`} className="btn btn-ghost">
                        Voir le resto
                      </Link>
                      {org.owner ? (
                        <button
                          type="button"
                          className="btn btn-ghost text-xs"
                          onClick={() => resetOwnerPassword(org)}
                        >
                          Reset MDP Gérant
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className="btn btn-ghost text-xs text-red-600"
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
      )}
    </div>
  );
}
