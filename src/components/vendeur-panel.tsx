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
  activeOrders: number;
  dishes: number;
};

function suggestPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < 10; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export function VendeurPanel({
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
  
  // Assign owner modal state
  const [assigningOrg, setAssigningOrg] = useState<OrgRow | null>(null);
  const [assignOwnerPassword, setAssignOwnerPassword] = useState(suggestPassword);

  const [createdCred, setCreatedCred] = useState<{
    restaurant: string;
    email?: string;
    password?: string;
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
    const res = await fetch("/api/vendeur/restaurants");
    if (!res.ok) return;
    const data = await res.json();
    setOrgs(data);
    setStats({
      restaurants: data.length,
      activeOrders: data.reduce((acc: number, o: OrgRow) => acc + o.counts.orders, 0),
      dishes: data.reduce((acc: number, o: OrgRow) => acc + o.counts.items, 0),
    });
  }

  async function createRestaurant(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setCreatedCred(null);
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    
    const ownerEmail = String(form.get("ownerEmail") || "").trim();
    const ownerName = String(form.get("ownerName") || "").trim();
    const password = String(form.get("ownerPassword") || provisionalPassword);

    try {
      const res = await fetch("/api/vendeur/restaurants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurantName: form.get("restaurantName"),
          ...(ownerEmail && ownerName
            ? {
                ownerName,
                ownerEmail,
                ownerPassword: password,
              }
            : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Erreur");
        return;
      }
      setCreatedCred({
        restaurant: data.name,
        email: data.owner?.email,
        password: data.provisionalPassword,
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

  async function handleAssignOwner(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!assigningOrg) return;
    setLoading(true);
    setError("");
    const formEl = e.currentTarget;
    const form = new FormData(formEl);

    try {
      const res = await fetch(`/api/vendeur/restaurants/${assigningOrg.id}/owner`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.get("ownerName"),
          email: form.get("ownerEmail"),
          password: assignOwnerPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Erreur");
        return;
      }
      setResetCred({
        restaurant: assigningOrg.name,
        email: data.user.email,
        password: data.provisionalPassword,
      });
      setAssigningOrg(null);
      await refresh();
    } finally {
      setLoading(false);
    }
  }

  async function resetOwnerPassword(org: OrgRow) {
    if (!org.owner) return;
    if (!window.confirm(`Nouveau mot de passe provisoire pour ${org.owner.email} ?`)) return;
    setError("");
    const res = await fetch(`/api/vendeur/restaurants/${org.id}/owner`, {
      method: "PUT",
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
      {/* Stats Cards */}
      <section className="grid gap-3 sm:grid-cols-3">
        {[
          ["Mes Restaurants", stats.restaurants, "Créés et gérés par toi"],
          ["Plats au Menu", stats.dishes, "Total plats sur tes cartes"],
          ["Commandes live", stats.activeOrders, "Dans tes établissements"],
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
        {/* Create Restaurant Form */}
        <form
          onSubmit={createRestaurant}
          className="space-y-4 rounded-[1.5rem] border border-[var(--line)] bg-[var(--card)] p-5 shadow-[0_12px_40px_rgba(28,25,23,0.06)]"
        >
          <div>
            <p className="muted text-xs uppercase tracking-[0.16em]">Nouveau Restaurant</p>
            <h2 className="mt-1 text-2xl font-semibold">Créer un restaurant</h2>
            <p className="muted mt-1 text-sm" style={{ fontFamily: "var(--font-mono)" }}>
              Tu pourras ensuite personnaliser son menu, sa charte graphique, et lui assigner un gérant.
            </p>
          </div>

          <input className="input" name="restaurantName" placeholder="Nom du restaurant" required />

          <div className="pt-2">
            <p className="text-xs uppercase tracking-[0.14em] font-semibold mb-2 opacity-70">
              Gérant (Optionnel à la création)
            </p>
            <div className="space-y-3">
              <input className="input" name="ownerName" placeholder="Nom du gérant (optionnel)" />
              <input className="input" name="ownerEmail" type="email" placeholder="Email du gérant (optionnel)" />
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <label className="label mb-0" htmlFor="ownerPassword">
                    Mot de passe provisoire gérant
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
                  autoComplete="off"
                  style={{ fontFamily: "var(--font-mono)" }}
                />
              </div>
            </div>
          </div>

          {error ? <p className="text-sm text-red-700">{error}</p> : null}

          {createdCred ? (
            <div
              className="rounded-2xl border px-4 py-3 text-sm space-y-2"
              style={{
                borderColor: "color-mix(in srgb, var(--ok) 40%, var(--line))",
                background: "color-mix(in srgb, var(--ok) 8%, white)",
              }}
            >
              <div className="font-semibold">Restaurant créé avec succès !</div>
              <p className="opacity-80" style={{ fontFamily: "var(--font-mono)" }}>
                {createdCred.restaurant}
                {createdCred.email ? (
                  <>
                    <br />
                    Gérant : {createdCred.email}
                    <br />
                    MDP provisoire : {createdCred.password}
                  </>
                ) : null}
              </p>
              <Link href={`/dashboard/${createdCred.orgId}`} className="btn mt-2 inline-block">
                Personnaliser le menu & le restaurant
              </Link>
            </div>
          ) : null}

          <button className="btn w-full" disabled={loading}>
            {loading ? "Création..." : "Créer le restaurant"}
          </button>
        </form>

        {/* Restaurants List */}
        <section className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="muted text-xs uppercase tracking-[0.16em]">Portefeuille</p>
              <h2 className="text-2xl font-semibold">Tes Restaurants</h2>
            </div>
            <input
              className="input max-w-xs"
              placeholder="Rechercher un resto…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          {filtered.length === 0 ? (
            <div className="rounded-[1.35rem] border border-dashed border-[var(--line)] bg-[var(--card)] p-8 text-center">
              <p className="muted">Aucun restaurant pour le moment.</p>
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
              <div className="font-semibold">Compte gérant mis à jour</div>
              <p className="mt-1 opacity-80" style={{ fontFamily: "var(--font-mono)" }}>
                {resetCred.restaurant}
                <br />
                {resetCred.email}
                <br />
                Nouveau MDP : {resetCred.password}
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
                      <div className="text-xs uppercase tracking-[0.14em] opacity-55">Gérant (Exploitation)</div>
                      {org.owner ? (
                        <div className="mt-0.5 flex items-center justify-between gap-2 flex-wrap">
                          <div>
                            <span className="font-semibold">{org.owner.name}</span>
                            <span className="muted"> · {org.owner.email}</span>
                            {org.owner.mustChangePassword ? (
                              <span className="ml-2 text-xs font-semibold text-amber-800">
                                (MDP provisoire)
                              </span>
                            ) : null}
                          </div>
                          <button
                            type="button"
                            className="text-xs underline font-semibold text-amber-900"
                            onClick={() => resetOwnerPassword(org)}
                          >
                            Reset MDP
                          </button>
                        </div>
                      ) : (
                        <div className="mt-1 flex items-center justify-between gap-2">
                          <span className="muted text-xs">Aucun gérant assigné</span>
                          <button
                            type="button"
                            className="text-xs font-semibold underline text-[var(--brand)]"
                            onClick={() => {
                              setAssigningOrg(org);
                              setAssignOwnerPassword(suggestPassword());
                            }}
                          >
                            + Assigner un gérant
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Link href={`/dashboard/${org.id}`} className="btn">
                      Personnaliser & Menu
                    </Link>
                    <Link href={`/o/${org.slug}`} target="_blank" className="btn btn-ghost">
                      Menu Client ↗
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>

      {/* Assign Owner Modal */}
      {assigningOrg ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-[1.5rem] border border-[var(--line)] bg-[var(--card)] p-6 shadow-2xl space-y-4">
            <div>
              <h3 className="text-xl font-semibold">Assigner un gérant</h3>
              <p className="muted text-sm" style={{ fontFamily: "var(--font-mono)" }}>
                Pour le restaurant : {assigningOrg.name}
              </p>
            </div>
            <form onSubmit={handleAssignOwner} className="space-y-3">
              <input className="input" name="ownerName" placeholder="Nom du gérant" required />
              <input className="input" name="ownerEmail" type="email" placeholder="Email du gérant" required />
              <div className="space-y-1">
                <label className="text-xs font-semibold opacity-70">Mot de passe provisoire</label>
                <input
                  className="input"
                  name="ownerPassword"
                  value={assignOwnerPassword}
                  onChange={(e) => setAssignOwnerPassword(e.target.value)}
                  minLength={6}
                  required
                  style={{ fontFamily: "var(--font-mono)" }}
                />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setAssigningOrg(null)}
                >
                  Annuler
                </button>
                <button className="btn" disabled={loading}>
                  {loading ? "Assignation..." : "Enregistrer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
