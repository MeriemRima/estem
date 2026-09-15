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

type UserMembership = {
  role: string;
  organization: {
    id: string;
    name: string;
    slug: string;
  };
};

type UserRow = {
  id: string;
  name: string;
  email: string;
  isSuperAdmin: boolean;
  isVendeur?: boolean;
  mustChangePassword: boolean;
  createdAt: string;
  memberships: UserMembership[];
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
  initialUsers = [],
  currentUserId,
  initialStats,
  initialVendeurs = [],
}: {
  initialOrgs: OrgRow[];
  initialUsers?: UserRow[];
  currentUserId?: string;
  initialStats: Stats;
  initialVendeurs?: Vendeur[];
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"restaurants" | "vendeurs" | "users">("restaurants");

  const [orgs, setOrgs] = useState<OrgRow[]>(initialOrgs);
  const [users, setUsers] = useState<UserRow[]>(initialUsers);
  const [vendeurs, setVendeurs] = useState<Vendeur[]>(initialVendeurs);
  const [stats, setStats] = useState<Stats>(initialStats);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [userQuery, setUserQuery] = useState("");
  const [vendeurQuery, setVendeurQuery] = useState("");

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

  // Modal states
  const [resetModal, setResetModal] = useState<{
    targetType: "org" | "user" | "vendeur";
    id: string;
    title: string;
    email: string;
  } | null>(null);
  const [customPassword, setCustomPassword] = useState("");
  const [resetSuccessCred, setResetSuccessCred] = useState<{
    title: string;
    email: string;
    password: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const [deleteOrgModal, setDeleteOrgModal] = useState<OrgRow | null>(null);
  const [deleteUserModal, setDeleteUserModal] = useState<UserRow | null>(null);
  const [deleteVendeurModal, setDeleteVendeurModal] = useState<Vendeur | null>(null);

  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState("");

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
    const q = vendeurQuery.trim().toLowerCase();
    if (!q) return vendeurs;
    return vendeurs.filter(
      (v) =>
        v.name.toLowerCase().includes(q) ||
        v.email.toLowerCase().includes(q),
    );
  }, [vendeurs, vendeurQuery]);

  const filteredUsers = useMemo(() => {
    const q = userQuery.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.memberships.some((m) => m.organization.name.toLowerCase().includes(q)),
    );
  }, [users, userQuery]);

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
    if (data.users) {
      setUsers(data.users);
    }
  }

  async function copyToClipboard(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
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
        setError(data.error || "Erreur lors de la création du vendeur");
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
        setError(data.error || "Erreur lors de la création");
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

  function openResetModal(
    targetType: "org" | "user" | "vendeur",
    id: string,
    title: string,
    email: string,
  ) {
    setResetModal({ targetType, id, title, email });
    setCustomPassword(suggestPassword());
    setResetSuccessCred(null);
    setCopied(false);
    setModalError("");
  }

  async function handleResetPassword(e: FormEvent) {
    e.preventDefault();
    if (!resetModal) return;
    setModalLoading(true);
    setModalError("");
    try {
      let url = "";
      let payload: Record<string, string> = {};

      if (resetModal.targetType === "org") {
        url = `/api/super-admin/restaurants/${resetModal.id}/reset-password`;
        payload = { password: customPassword };
      } else if (resetModal.targetType === "user") {
        url = `/api/super-admin/users/${resetModal.id}/reset-password`;
        payload = { password: customPassword };
      } else {
        url = `/api/super-admin/vendeurs/${resetModal.id}`;
        payload = { newPassword: customPassword };
      }

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setModalError(data.error || "Réinitialisation impossible");
        return;
      }
      setResetSuccessCred({
        title: resetModal.title,
        email: data.email || resetModal.email,
        password: data.provisionalPassword,
      });
      await refresh();
    } catch {
      setModalError("Une erreur réseau est survenue");
    } finally {
      setModalLoading(false);
    }
  }

  async function handleDeleteOrg() {
    if (!deleteOrgModal) return;
    setModalLoading(true);
    setModalError("");
    try {
      const res = await fetch(`/api/super-admin/restaurants/${deleteOrgModal.id}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setModalError(data.error || "Suppression impossible");
        return;
      }
      setDeleteOrgModal(null);
      await refresh();
    } catch {
      setModalError("Une erreur réseau est survenue");
    } finally {
      setModalLoading(false);
    }
  }

  async function handleDeleteUser() {
    if (!deleteUserModal) return;
    setModalLoading(true);
    setModalError("");
    try {
      const res = await fetch(`/api/super-admin/users/${deleteUserModal.id}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setModalError(data.error || "Suppression impossible");
        return;
      }
      setDeleteUserModal(null);
      await refresh();
    } catch {
      setModalError("Une erreur réseau est survenue");
    } finally {
      setModalLoading(false);
    }
  }

  async function handleDeleteVendeur() {
    if (!deleteVendeurModal) return;
    setModalLoading(true);
    setModalError("");
    try {
      const res = await fetch(`/api/super-admin/vendeurs/${deleteVendeurModal.id}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setModalError(data.error || "Suppression impossible");
        return;
      }
      setDeleteVendeurModal(null);
      await refresh();
    } catch {
      setModalError("Une erreur réseau est survenue");
    } finally {
      setModalLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Platform Stats Cards */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Account Managers (Vendeurs)", stats.vendeursCount ?? vendeurs.length, "Gestionnaires de portefeuille"],
          ["Restaurants", stats.restaurants, "Créés sur la plateforme"],
          ["Comptes Globaux", stats.users, "Vendeurs, gérants & équipes"],
          ["Commandes live", stats.activeOrders, "En cours sur la plateforme"],
        ].map(([label, value, hint]) => (
          <div
            key={label as string}
            className="relative overflow-hidden rounded-[1.35rem] border border-[var(--line)] bg-[var(--card)] p-5"
          >
            <div
              className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-30"
              style={{
                background: "radial-gradient(circle, rgba(194,65,12,0.35), transparent 70%)",
              }}
            />
            <div className="muted text-xs uppercase tracking-[0.16em]">{label}</div>
            <div className="mt-2 text-3xl font-semibold tabular-nums">{value}</div>
            <p className="muted mt-1 text-xs" style={{ fontFamily: "var(--font-mono)" }}>
              {hint}
            </p>
          </div>
        ))}
      </section>

      {/* Tabs Switcher: Restaurants vs Vendeurs vs Utilisateurs */}
      <div className="flex border-b border-[var(--line)] gap-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab("restaurants")}
          className={`pb-3 px-4 font-semibold text-sm transition border-b-2 flex items-center gap-2 whitespace-nowrap ${
            activeTab === "restaurants"
              ? "border-[var(--brand)] text-[var(--brand)]"
              : "border-transparent text-[var(--muted)] hover:text-[var(--ink)]"
          }`}
        >
          <span>Restaurants</span>
          <span className="rounded-full bg-[var(--line)] px-2 py-0.5 text-xs font-mono text-[var(--ink)]">
            {orgs.length}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("vendeurs")}
          className={`pb-3 px-4 font-semibold text-sm transition border-b-2 flex items-center gap-2 whitespace-nowrap ${
            activeTab === "vendeurs"
              ? "border-[var(--brand)] text-[var(--brand)]"
              : "border-transparent text-[var(--muted)] hover:text-[var(--ink)]"
          }`}
        >
          <span>Gestion des Vendeurs</span>
          <span className="rounded-full bg-[var(--line)] px-2 py-0.5 text-xs font-mono text-[var(--ink)]">
            {vendeurs.length}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("users")}
          className={`pb-3 px-4 font-semibold text-sm transition border-b-2 flex items-center gap-2 whitespace-nowrap ${
            activeTab === "users"
              ? "border-[var(--brand)] text-[var(--brand)]"
              : "border-transparent text-[var(--muted)] hover:text-[var(--ink)]"
          }`}
        >
          <span>Utilisateurs</span>
          <span className="rounded-full bg-[var(--line)] px-2 py-0.5 text-xs font-mono text-[var(--ink)]">
            {users.length}
          </span>
        </button>
      </div>

      {/* TAB 1: RESTAURANTS */}
      {activeTab === "restaurants" ? (
        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <form
            onSubmit={createRestaurant}
            className="space-y-4 rounded-[1.5rem] border border-[var(--line)] bg-[var(--card)] p-5 shadow-[0_12px_40px_rgba(28,25,23,0.06)]"
          >
            <div>
              <p className="muted text-xs uppercase tracking-[0.16em]">Direct SuperAdmin</p>
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
                  className="text-xs font-semibold underline opacity-70 hover:opacity-100"
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
                className="rounded-2xl border px-4 py-3 text-sm space-y-2"
                style={{
                  borderColor: "color-mix(in srgb, var(--ok) 40%, var(--line))",
                  background: "color-mix(in srgb, var(--ok) 8%, white)",
                }}
              >
                <div className="font-semibold text-emerald-800">Compte gérant créé !</div>
                <div className="text-xs opacity-90 space-y-1" style={{ fontFamily: "var(--font-mono)" }}>
                  <div><strong>Restaurant :</strong> {createdCred.restaurant}</div>
                  <div><strong>Email :</strong> {createdCred.email}</div>
                  <div><strong>MDP :</strong> {createdCred.password}</div>
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() =>
                      copyToClipboard(
                        `Restaurant: ${createdCred.restaurant}\nEmail: ${createdCred.email}\nMot de passe: ${createdCred.password}`
                      )
                    }
                    className="btn btn-ghost text-xs py-1.5 px-3"
                  >
                    {copied ? "✓ Identifiants copiés !" : "Copier les identifiants"}
                  </button>
                  <Link href={`/dashboard/${createdCred.orgId}`} className="btn text-xs py-1.5 px-3">
                    Ouvrir le restaurant
                  </Link>
                </div>
              </div>
            ) : null}

            <button className="btn w-full" disabled={loading}>
              {loading ? "Création en cours..." : "Créer resto + compte gérant"}
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
                          <span className="text-xs bg-amber-50 text-amber-900 border border-amber-200 px-2 py-0.5 rounded-full font-medium">
                            Vendeur : {org.vendeur.name}
                          </span>
                        ) : (
                          <span className="text-xs bg-stone-100 text-stone-700 px-2 py-0.5 rounded-full font-medium">
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
                          <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                            <span className="font-semibold">{org.owner.name}</span>
                            <span className="muted"> · {org.owner.email}</span>
                            {org.owner.mustChangePassword ? (
                              <span className="ml-1 rounded bg-amber-100 px-1.5 py-0.5 text-xs font-semibold text-amber-800">
                                MDP provisoire
                              </span>
                            ) : null}
                          </div>
                        ) : (
                          <div className="muted mt-0.5 text-xs italic">Aucun gérant assigné</div>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Link href={`/dashboard/${org.id}`} className="btn btn-ghost text-xs py-2 px-3">
                        Voir le resto
                      </Link>
                      {org.owner ? (
                        <button
                          type="button"
                          className="btn btn-ghost text-xs py-2 px-3"
                          onClick={() =>
                            openResetModal("org", org.id, org.name, org.owner?.email || "")
                          }
                        >
                          Reset MDP Gérant
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className="btn btn-ghost text-xs py-2 px-3 text-red-600 hover:text-red-700 hover:border-red-300"
                        onClick={() => {
                          setModalError("");
                          setDeleteOrgModal(org);
                        }}
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
      ) : null}

      {/* TAB 2: GESTION DES VENDEURS */}
      {activeTab === "vendeurs" ? (
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

            <input className="input" name="name" placeholder="Nom complet du vendeur" required />
            <input className="input" name="email" type="email" placeholder="Email professionnel" required />

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label className="label mb-0" htmlFor="vendeurPassword">
                  Mot de passe provisoire
                </label>
                <button
                  type="button"
                  className="text-xs font-semibold underline opacity-70 hover:opacity-100"
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
                className="rounded-2xl border px-4 py-3 text-sm space-y-2"
                style={{
                  borderColor: "color-mix(in srgb, var(--ok) 40%, var(--line))",
                  background: "color-mix(in srgb, var(--ok) 8%, white)",
                }}
              >
                <div className="font-semibold text-emerald-800">Compte Vendeur créé !</div>
                <div className="text-xs opacity-90 space-y-1" style={{ fontFamily: "var(--font-mono)" }}>
                  <div><strong>Nom :</strong> {createdVendeurCred.name}</div>
                  <div><strong>Email :</strong> {createdVendeurCred.email}</div>
                  <div><strong>MDP provisoire :</strong> {createdVendeurCred.password}</div>
                </div>
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() =>
                      copyToClipboard(
                        `Nom: ${createdVendeurCred.name}\nEmail: ${createdVendeurCred.email}\nMot de passe: ${createdVendeurCred.password}`
                      )
                    }
                    className="btn btn-ghost text-xs py-1.5 px-3"
                  >
                    {copied ? "✓ Identifiants copiés !" : "Copier les identifiants"}
                  </button>
                </div>
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
                <p className="muted text-xs uppercase tracking-[0.16em]">Portefeuille Partenaires</p>
                <h2 className="text-2xl font-semibold">Tous les Vendeurs</h2>
              </div>
              <input
                className="input max-w-xs"
                placeholder="Rechercher vendeur…"
                value={vendeurQuery}
                onChange={(e) => setVendeurQuery(e.target.value)}
              />
            </div>

            {filteredVendeurs.length === 0 ? (
              <div className="rounded-[1.35rem] border border-dashed border-[var(--line)] bg-[var(--card)] p-8 text-center">
                <p className="muted">Aucun vendeur enregistré.</p>
              </div>
            ) : null}

            <div className="space-y-3">
              {filteredVendeurs.map((v) => (
                <article
                  key={v.id}
                  className="rounded-[1.35rem] border border-[var(--line)] bg-[var(--card)] p-4 transition hover:border-[var(--brand)]"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-base font-semibold">{v.name}</h3>
                      <p className="muted text-sm mt-0.5" style={{ fontFamily: "var(--font-mono)" }}>
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
                        className="btn btn-ghost text-xs py-2 px-3"
                        onClick={() => openResetModal("vendeur", v.id, `Vendeur ${v.name}`, v.email)}
                      >
                        Reset MDP
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost text-xs py-2 px-3 text-red-600 hover:text-red-700 hover:border-red-300"
                        onClick={() => {
                          setModalError("");
                          setDeleteVendeurModal(v);
                        }}
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
      ) : null}

      {/* TAB 3: UTILISATEURS */}
      {activeTab === "users" ? (
        <section className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="muted text-xs uppercase tracking-[0.16em]">Comptes & Accès</p>
              <h2 className="text-2xl font-semibold">Gestion des utilisateurs</h2>
              <p className="muted text-xs mt-1" style={{ fontFamily: "var(--font-mono)" }}>
                Gérez les comptes indépendamment des restaurants. La suppression d&apos;un compte libère son adresse email.
              </p>
            </div>
            <input
              className="input max-w-xs"
              placeholder="Rechercher nom, email, restaurant…"
              value={userQuery}
              onChange={(e) => setUserQuery(e.target.value)}
            />
          </div>

          {filteredUsers.length === 0 ? (
            <div className="rounded-[1.35rem] border border-dashed border-[var(--line)] bg-[var(--card)] p-8 text-center">
              <p className="muted">Aucun utilisateur trouvé.</p>
            </div>
          ) : null}

          <div className="space-y-3">
            {filteredUsers.map((u) => {
              const isCurrent = u.id === currentUserId;
              const hasMemberships = u.memberships && u.memberships.length > 0;

              return (
                <article
                  key={u.id}
                  className="rounded-[1.35rem] border border-[var(--line)] bg-[var(--card)] p-4 transition hover:border-[var(--brand)]"
                >
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[rgba(194,65,12,0.12)] font-semibold text-[var(--brand)] text-base">
                        {u.name ? u.name.charAt(0).toUpperCase() : "U"}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold text-base">{u.name}</h3>
                          {isCurrent ? (
                            <span className="rounded-md bg-stone-200 px-2 py-0.5 text-xs font-semibold text-stone-700">
                              Votre compte
                            </span>
                          ) : null}
                          {u.isSuperAdmin ? (
                            <span className="rounded-md bg-purple-100 px-2 py-0.5 text-xs font-semibold text-purple-800">
                              Super Admin
                            </span>
                          ) : null}
                          {u.isVendeur ? (
                            <span className="rounded-md bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                              Vendeur
                            </span>
                          ) : null}
                          {u.mustChangePassword ? (
                            <span className="rounded-md bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                              MDP provisoire
                            </span>
                          ) : null}
                        </div>
                        <p className="muted text-xs mt-1" style={{ fontFamily: "var(--font-mono)" }}>
                          {u.email} · Inscrit le {new Date(u.createdAt).toLocaleDateString("fr-FR")}
                        </p>
                        {hasMemberships ? (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {u.memberships.map((m) => (
                              <span
                                key={m.organization.id}
                                className="inline-flex items-center gap-1 rounded-md bg-[var(--line)] px-2 py-0.5 text-xs"
                              >
                                <span className="font-semibold">{m.organization.name}</span>
                                <span className="muted">({m.role})</span>
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="muted text-xs italic mt-1.5">Aucun restaurant assigné</p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="btn btn-ghost text-xs py-2 px-3"
                        onClick={() => openResetModal("user", u.id, u.name, u.email)}
                      >
                        Reset MDP
                      </button>
                      <button
                        type="button"
                        disabled={isCurrent || u.isSuperAdmin}
                        title={
                          isCurrent
                            ? "Vous ne pouvez pas supprimer votre propre compte"
                            : u.isSuperAdmin
                            ? "Compte Super Admin protégé"
                            : "Supprimer cet utilisateur"
                        }
                        className="btn btn-ghost text-xs py-2 px-3 text-red-600 hover:text-red-700 hover:border-red-300 disabled:opacity-40 disabled:cursor-not-allowed"
                        onClick={() => {
                          setModalError("");
                          setDeleteUserModal(u);
                        }}
                      >
                        Supprimer
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ) : null}

      {/* MODAL 1: RESET PASSWORD (Common for Org, User, Vendeur) */}
      {resetModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="card relative max-h-[90vh] w-full max-w-md space-y-4 shadow-2xl border border-[var(--line)] bg-[var(--card)] p-6 rounded-2xl overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[var(--line)] pb-3">
              <div>
                <h3 className="text-lg font-bold">Réinitialiser le mot de passe</h3>
                <p className="muted text-xs mt-0.5">
                  {resetModal.title} · {resetModal.email}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setResetModal(null)}
                className="flex h-7 w-7 items-center justify-center rounded-full text-base hover:bg-black/10 transition"
              >
                ✕
              </button>
            </div>

            {modalError ? (
              <div className="rounded-lg bg-red-100 p-2.5 text-xs text-red-800">
                {modalError}
              </div>
            ) : null}

            {resetSuccessCred ? (
              <div className="space-y-4 py-2">
                <div
                  className="rounded-2xl border p-4 text-sm space-y-2"
                  style={{
                    borderColor: "color-mix(in srgb, var(--ok) 40%, var(--line))",
                    background: "color-mix(in srgb, var(--ok) 8%, white)",
                  }}
                >
                  <div className="font-semibold text-emerald-800 flex items-center gap-2">
                    <span>✓</span> Mot de passe réinitialisé avec succès !
                  </div>
                  <p className="text-xs text-stone-600">
                    Le compte sera invité à changer ce mot de passe à sa prochaine connexion.
                  </p>
                  <div
                    className="mt-2 rounded-xl bg-white/80 p-3 text-xs space-y-1 border border-[var(--line)]"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    <div><strong>Identifiant :</strong> {resetSuccessCred.email}</div>
                    <div><strong>Mot de passe provisoire :</strong> {resetSuccessCred.password}</div>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      copyToClipboard(
                        `Email: ${resetSuccessCred.email}\nNouveau mot de passe provisoire: ${resetSuccessCred.password}`
                      )
                    }
                    className="btn w-full text-xs py-2.5"
                  >
                    {copied ? "✓ Identifiants copiés dans le presse-papier !" : "Copier les identifiants"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setResetModal(null)}
                    className="btn btn-ghost w-full text-xs py-2"
                  >
                    Fermer
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <p className="text-xs text-stone-600">
                  Définissez un mot de passe provisoire pour <strong>{resetModal.email}</strong>. L&apos;utilisateur devra le modifier dès sa première connexion.
                </p>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="label mb-0 text-xs font-semibold" htmlFor="customModalPassword">
                      Mot de passe provisoire
                    </label>
                    <button
                      type="button"
                      className="text-xs font-semibold underline text-[var(--brand)] hover:opacity-80"
                      onClick={() => setCustomPassword(suggestPassword())}
                    >
                      Générer un autre
                    </button>
                  </div>
                  <input
                    id="customModalPassword"
                    className="input text-sm"
                    type="text"
                    value={customPassword}
                    onChange={(e) => setCustomPassword(e.target.value)}
                    minLength={6}
                    required
                    style={{ fontFamily: "var(--font-mono)" }}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-[var(--line)]">
                  <button
                    type="button"
                    onClick={() => setResetModal(null)}
                    className="btn btn-ghost text-xs py-2 px-3"
                    disabled={modalLoading}
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="btn text-xs py-2 px-4"
                    disabled={modalLoading}
                  >
                    {modalLoading ? "Réinitialisation..." : "Confirmer le reset"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      ) : null}

      {/* MODAL 2: DELETE RESTAURANT */}
      {deleteOrgModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="card relative max-h-[90vh] w-full max-w-md space-y-4 shadow-2xl border border-[var(--line)] bg-[var(--card)] p-6 rounded-2xl overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[var(--line)] pb-3">
              <div>
                <h3 className="text-lg font-bold text-red-700">Supprimer le restaurant</h3>
                <p className="muted text-xs mt-0.5">{deleteOrgModal.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setDeleteOrgModal(null)}
                className="flex h-7 w-7 items-center justify-center rounded-full text-base hover:bg-black/10 transition"
              >
                ✕
              </button>
            </div>

            {modalError ? (
              <div className="rounded-lg bg-red-100 p-2.5 text-xs text-red-800">
                {modalError}
              </div>
            ) : null}

            <p className="text-sm">
              Êtes-vous sûr de vouloir supprimer définitivement le restaurant{" "}
              <strong>« {deleteOrgModal.name} »</strong> ({deleteOrgModal.slug}) ?
            </p>

            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-900 space-y-1.5">
              <div className="font-semibold">Attention : Cette action est irréversible !</div>
              <ul className="list-disc pl-4 space-y-1 text-red-800">
                <li>Tous les plats ({deleteOrgModal.counts.items}), tables ({deleteOrgModal.counts.tables}) et commandes ({deleteOrgModal.counts.orders}) seront définitivement effacés.</li>
                <li><strong>Le compte du gérant restera intact</strong> dans le système et peut être réutilisé pour créer un nouveau restaurant ou géré dans l&apos;onglet « Utilisateurs ».</li>
              </ul>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[var(--line)]">
              <button
                type="button"
                onClick={() => setDeleteOrgModal(null)}
                className="btn btn-ghost text-xs py-2 px-3"
                disabled={modalLoading}
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleDeleteOrg}
                disabled={modalLoading}
                className="btn text-xs py-2 px-4 bg-red-600 hover:bg-red-700 text-white"
              >
                {modalLoading ? "Suppression en cours..." : "Supprimer définitivement le restaurant"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* MODAL 3: DELETE USER */}
      {deleteUserModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="card relative max-h-[90vh] w-full max-w-md space-y-4 shadow-2xl border border-[var(--line)] bg-[var(--card)] p-6 rounded-2xl overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[var(--line)] pb-3">
              <div>
                <h3 className="text-lg font-bold text-red-700">Supprimer l&apos;utilisateur</h3>
                <p className="muted text-xs mt-0.5">
                  {deleteUserModal.name} · {deleteUserModal.email}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDeleteUserModal(null)}
                className="flex h-7 w-7 items-center justify-center rounded-full text-base hover:bg-black/10 transition"
              >
                ✕
              </button>
            </div>

            {modalError ? (
              <div className="rounded-lg bg-red-100 p-2.5 text-xs text-red-800">
                {modalError}
              </div>
            ) : null}

            <p className="text-sm">
              Êtes-vous sûr de vouloir supprimer définitivement le compte utilisateur de{" "}
              <strong>« {deleteUserModal.name} »</strong> ({deleteUserModal.email}) ?
            </p>

            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-900 space-y-1.5">
              <div className="font-semibold">Conséquences de la suppression :</div>
              <ul className="list-disc pl-4 space-y-1 text-red-800">
                <li>L&apos;utilisateur ne pourra plus se connecter à la plateforme.</li>
                <li>L&apos;adresse email sera libérée et pourra être réutilisée.</li>
                <li>
                  {deleteUserModal.memberships.length > 0
                    ? `Les restaurants gérés (${deleteUserModal.memberships.map((m) => m.organization.name).join(", ")}) resteront intacts mais n'auront plus de gérant assigné.`
                    : "Cet utilisateur n'est actuellement assigné à aucun restaurant."}
                </li>
              </ul>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[var(--line)]">
              <button
                type="button"
                onClick={() => setDeleteUserModal(null)}
                className="btn btn-ghost text-xs py-2 px-3"
                disabled={modalLoading}
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleDeleteUser}
                disabled={modalLoading}
                className="btn text-xs py-2 px-4 bg-red-600 hover:bg-red-700 text-white"
              >
                {modalLoading ? "Suppression en cours..." : "Supprimer définitivement l'utilisateur"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* MODAL 4: DELETE VENDEUR */}
      {deleteVendeurModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="card relative max-h-[90vh] w-full max-w-md space-y-4 shadow-2xl border border-[var(--line)] bg-[var(--card)] p-6 rounded-2xl overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[var(--line)] pb-3">
              <div>
                <h3 className="text-lg font-bold text-red-700">Supprimer le Vendeur</h3>
                <p className="muted text-xs mt-0.5">
                  {deleteVendeurModal.name} · {deleteVendeurModal.email}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDeleteVendeurModal(null)}
                className="flex h-7 w-7 items-center justify-center rounded-full text-base hover:bg-black/10 transition"
              >
                ✕
              </button>
            </div>

            {modalError ? (
              <div className="rounded-lg bg-red-100 p-2.5 text-xs text-red-800">
                {modalError}
              </div>
            ) : null}

            <p className="text-sm">
              Êtes-vous sûr de vouloir supprimer le compte du vendeur{" "}
              <strong>« {deleteVendeurModal.name} »</strong> ({deleteVendeurModal.email}) ?
            </p>

            <div className="rounded-xl border border-stone-200 bg-stone-50 p-3 text-xs text-stone-800 space-y-1.5">
              <div className="font-semibold">Conséquences :</div>
              <ul className="list-disc pl-4 space-y-1 text-stone-700">
                <li>Le vendeur ne pourra plus se connecter au portail vendeur.</li>
                <li><strong>Tous les restaurants créés par ce vendeur seront conservés</strong> et rattachés directement à la plateforme.</li>
              </ul>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[var(--line)]">
              <button
                type="button"
                onClick={() => setDeleteVendeurModal(null)}
                className="btn btn-ghost text-xs py-2 px-3"
                disabled={modalLoading}
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleDeleteVendeur}
                disabled={modalLoading}
                className="btn text-xs py-2 px-4 bg-red-600 hover:bg-red-700 text-white"
              >
                {modalLoading ? "Suppression en cours..." : "Supprimer le vendeur"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
