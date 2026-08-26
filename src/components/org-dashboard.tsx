"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatMoney, qrImageUrl } from "@/lib/utils";
import { Branding, normalizeBranding } from "@/lib/branding";
import { RestaurantSettings } from "@/components/restaurant-settings";
import { RestaurantShell, RestaurantNavId } from "@/components/restaurant-shell";
import { LogoutButton } from "@/components/logout-button";
import Link from "next/link";

type Item = {
  id: string;
  name: string;
  description: string;
  priceCents: number;
  imageUrl: string;
  available: boolean;
  categoryId: string;
};

type Category = {
  id: string;
  name: string;
  items: Item[];
};

type Table = {
  id: string;
  name: string;
  token: string;
};

type Stats = {
  categories: number;
  items: number;
  tables: number;
  orders: number;
  activeOrders: number;
};

type Props = {
  orgId: string;
  orgName: string;
  slug: string;
  role: string;
  initialCategories: Category[];
  initialTables: Table[];
  initialStats: Stats;
  initialBranding: Branding;
  backHref?: string;
  backLabel?: string;
  roleLabel: string;
  initialTab?: RestaurantNavId;
};

export function OrgDashboard({
  orgId,
  orgName: initialOrgName,
  slug,
  role,
  initialCategories,
  initialTables,
  initialStats,
  initialBranding,
  backHref,
  backLabel,
  roleLabel,
  initialTab = "admin",
}: Props) {
  const router = useRouter();
  const canEdit = role === "OWNER" || role === "ADMIN";
  const isOwner = role === "OWNER";
  const [tab, setTab] = useState<RestaurantNavId>(
    initialTab === "kitchen" ? "admin" : initialTab,
  );
  const [categories, setCategories] = useState(initialCategories);
  const [tables, setTables] = useState(initialTables);
  const [stats, setStats] = useState(initialStats);
  const [orgName, setOrgName] = useState(initialOrgName);
  const [branding, setBranding] = useState(normalizeBranding(initialBranding));
  const [error, setError] = useState("");
  const [origin, setOrigin] = useState("");
  const [saving, setSaving] = useState(false);

  const [categoryName, setCategoryName] = useState("");
  const [itemCategoryId, setItemCategoryId] = useState("");
  const [itemName, setItemName] = useState("");
  const [itemDescription, setItemDescription] = useState("");
  const [itemPrice, setItemPrice] = useState("");
  const [itemImageFile, setItemImageFile] = useState<File | null>(null);
  const [tableName, setTableName] = useState("");
  const [editOrgName, setEditOrgName] = useState(initialOrgName);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [invitePassword, setInvitePassword] = useState("");
  const [inviteRole, setInviteRole] = useState<"ADMIN" | "MEMBER">("ADMIN");
  const [members, setMembers] = useState<
    { id: string; role: string; user: { name: string; email: string } }[]
  >([]);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    if (!canEdit) return;
    void fetch(`/api/orgs/${orgId}/members`)
      .then((r) => (r.ok ? r.json() : []))
      .then(setMembers)
      .catch(() => undefined);
  }, [orgId, canEdit]);

  async function uploadImage(): Promise<string> {
    if (!itemImageFile) return "";
    const fd = new FormData();
    fd.append("file", itemImageFile);
    const res = await fetch(`/api/orgs/${orgId}/upload`, { method: "POST", body: fd });
    if (!res.ok) throw new Error("UPLOAD");
    const data = await res.json();
    return data.url as string;
  }

  async function refresh() {
    const res = await fetch(`/api/orgs/${orgId}`);
    if (!res.ok) return;
    const data = await res.json();
    setCategories(data.categories);
    setTables(data.tables);
    setStats(data.stats);
    setOrgName(data.organization.name);
    setEditOrgName(data.organization.name);
  }

  async function addCategory(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const name = categoryName.trim();
    if (!name || saving) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/orgs/${orgId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Impossible d'ajouter la catégorie");
        return;
      }
      const created = await res.json();
      setCategories((prev) => [...prev, { ...created, items: [] }]);
      setCategoryName("");
      if (!itemCategoryId) setItemCategoryId(created.id);
      setStats((s) => ({ ...s, categories: s.categories + 1 }));
    } finally {
      setSaving(false);
    }
  }

  async function renameCategory(categoryId: string, current: string) {
    const name = window.prompt("Nouveau nom de catégorie", current)?.trim();
    if (!name || name === current) return;
    const res = await fetch(`/api/orgs/${orgId}/categories/${categoryId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) {
      setError("Modification catégorie impossible");
      return;
    }
    await refresh();
  }

  async function deleteCategory(categoryId: string, name: string) {
    if (!window.confirm(`Supprimer la catégorie « ${name} » et tous ses plats ?`)) return;
    const res = await fetch(`/api/orgs/${orgId}/categories/${categoryId}`, { method: "DELETE" });
    if (!res.ok) {
      setError("Suppression catégorie impossible");
      return;
    }
    await refresh();
  }

  async function addItem(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (saving) return;
    const price = Number(itemPrice);
    if (!itemCategoryId || !itemName.trim() || !Number.isFinite(price) || price <= 0) {
      setError("Remplis correctement le plat (prix en DH)");
      return;
    }
    setSaving(true);
    setError("");
    try {
      let imageUrl = "";
      try {
        imageUrl = await uploadImage();
      } catch {
        setError("Upload image échoué");
        return;
      }
      const res = await fetch(`/api/orgs/${orgId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: itemName.trim(),
          description: itemDescription.trim(),
          categoryId: itemCategoryId,
          priceCents: Math.round(price * 100),
          imageUrl,
        }),
      });
      if (!res.ok) {
        setError("Impossible d'ajouter le plat");
        return;
      }
      setItemName("");
      setItemDescription("");
      setItemPrice("");
      setItemImageFile(null);
      await refresh();
    } finally {
      setSaving(false);
    }
  }

  async function inviteMember(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/orgs/${orgId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: inviteName.trim(),
          email: inviteEmail.trim(),
          password: invitePassword,
          role: inviteRole,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Invitation impossible");
        return;
      }
      setMembers((prev) => [...prev, data]);
      setInviteName("");
      setInviteEmail("");
      setInvitePassword("");
    } finally {
      setSaving(false);
    }
  }

  async function editItem(item: Item) {
    const name = window.prompt("Nom du plat", item.name)?.trim();
    if (!name) return;
    const priceRaw = window.prompt("Prix en DH", String(item.priceCents / 100));
    if (priceRaw == null) return;
    const price = Number(priceRaw);
    if (!Number.isFinite(price) || price <= 0) {
      setError("Prix invalide");
      return;
    }
    const description =
      window.prompt("Description", item.description) ?? item.description;
    const res = await fetch(`/api/orgs/${orgId}/items/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        description,
        priceCents: Math.round(price * 100),
      }),
    });
    if (!res.ok) {
      setError("Modification plat impossible");
      return;
    }
    await refresh();
  }

  async function deleteItem(item: Item) {
    if (!window.confirm(`Supprimer « ${item.name} » ?`)) return;
    const res = await fetch(`/api/orgs/${orgId}/items/${item.id}`, { method: "DELETE" });
    if (!res.ok) {
      setError("Suppression plat impossible");
      return;
    }
    await refresh();
  }

  async function addTable(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const name = tableName.trim();
    if (!name || saving) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/orgs/${orgId}/tables`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        setError("Impossible d'ajouter la table");
        return;
      }
      const created = await res.json();
      setTables((prev) => [...prev, created]);
      setTableName("");
      setStats((s) => ({ ...s, tables: s.tables + 1 }));
    } finally {
      setSaving(false);
    }
  }

  async function renameTable(table: Table) {
    const name = window.prompt("Nouveau nom de table", table.name)?.trim();
    if (!name || name === table.name) return;
    const res = await fetch(`/api/orgs/${orgId}/tables/${table.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) {
      setError("Modification table impossible");
      return;
    }
    await refresh();
  }

  async function deleteTable(table: Table) {
    if (!window.confirm(`Supprimer la table « ${table.name} » ?`)) return;
    const res = await fetch(`/api/orgs/${orgId}/tables/${table.id}`, { method: "DELETE" });
    if (!res.ok) {
      setError("Suppression table impossible");
      return;
    }
    await refresh();
  }

  async function saveRestaurant(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const name = editOrgName.trim();
    if (!name || saving) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/orgs/${orgId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        setError("Impossible de modifier le restaurant");
        return;
      }
      const updated = await res.json();
      setOrgName(updated.name);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function deleteRestaurant() {
    if (
      !window.confirm(
        `Supprimer définitivement « ${orgName} » (menu, tables, commandes) ?`,
      )
    ) {
      return;
    }
    const res = await fetch(`/api/orgs/${orgId}`, { method: "DELETE" });
    if (!res.ok) {
      setError("Suppression restaurant impossible (Gérant uniquement)");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <RestaurantShell
      orgId={orgId}
      orgName={orgName}
      branding={branding}
      active={tab}
      backHref={backHref}
      backLabel={backLabel}
      roleLabel={roleLabel}
      slug={slug}
      pendingOrders={stats.activeOrders}
      onNavigate={(id) => {
        if (id === "kitchen") {
          router.push(`/dashboard/${orgId}/kitchen`);
          return;
        }
        setTab(id);
      }}
      headerActions={
        <>
          <Link href={`/dashboard/${orgId}/kitchen`} className="btn">
            Voir les commandes
          </Link>
          <LogoutButton />
        </>
      }
    >
      {error ? <p className="mb-4 text-sm text-red-700">{error}</p> : null}

      {tab === "settings" ? (
        <RestaurantSettings
          orgId={orgId}
          orgName={orgName}
          initial={branding}
          canEdit={canEdit}
          onSaved={(next) => {
            setBranding(normalizeBranding(next));
            if (next.name) {
              setOrgName(next.name);
              setEditOrgName(next.name);
            }
            router.refresh();
          }}
        />
      ) : null}

      {tab === "admin" ? (
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-4">
            <section className="card">
              <h2 className="text-xl font-semibold">Vue admin — {orgName}</h2>
              <p className="muted mt-1 text-sm" style={{ fontFamily: "var(--font-mono)" }}>
                Multi-tenant · {role === "OWNER" ? "Gérant" : role === "ADMIN" ? "Responsable" : role} · /{slug} · devises en DH (MAD)
              </p>
              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {[
                  ["Catégories", stats.categories],
                  ["Plats", stats.items],
                  ["Tables", stats.tables],
                  ["Commandes", stats.orders],
                  ["Actives", stats.activeOrders],
                ].map(([label, value]) => (
                  <div key={label as string} className="rounded-2xl bg-[rgba(194,65,12,0.08)] p-4">
                    <div className="muted text-xs uppercase tracking-wide">{label}</div>
                    <div className="mt-1 text-2xl font-semibold">{value}</div>
                  </div>
                ))}
              </div>
            </section>

            <section className="card space-y-3">
              <h3 className="text-lg font-semibold">Parcours (architecture)</h3>
              <ol className="space-y-2 text-sm" style={{ fontFamily: "var(--font-mono)" }}>
                <li>1. Organisation créée (Gérant)</li>
                <li>2. Menu : catégories & plats (CRUD)</li>
                <li>3. Tables + QR imprimables</li>
                <li>4. Client scanne QR → commande</li>
                <li>5. Cuisine / dashboard temps réel (SSE)</li>
              </ol>
              <div className="flex flex-wrap gap-2 pt-2">
                <button type="button" className="btn" onClick={() => setTab("menu")}>
                  Gérer le menu
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => setTab("tables")}>
                  Gérer les tables
                </button>
              </div>
            </section>
          </div>

          <div className="space-y-4">
            {canEdit ? (
              <form onSubmit={inviteMember} className="card space-y-3">
                <h3 className="text-lg font-semibold">Inviter l&apos;équipe</h3>
                <p className="muted text-sm" style={{ fontFamily: "var(--font-mono)" }}>
                  Compte avec mot de passe provisoire — accès limité à ce restaurant.
                </p>
                <input
                  className="input"
                  placeholder="Nom"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  required
                />
                <input
                  className="input"
                  type="email"
                  placeholder="Email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  required
                />
                <input
                  className="input"
                  type="password"
                  placeholder="Mot de passe provisoire"
                  value={invitePassword}
                  onChange={(e) => setInvitePassword(e.target.value)}
                  minLength={6}
                  required
                />
                <select
                  className="input"
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as "ADMIN" | "MEMBER")}
                >
                  <option value="ADMIN">Responsable (menu + commandes)</option>
                  <option value="MEMBER">Équipe (commandes)</option>
                </select>
                <button className="btn" disabled={saving}>
                  Inviter
                </button>
                {members.length > 0 ? (
                  <ul className="space-y-1 pt-2 text-sm" style={{ fontFamily: "var(--font-mono)" }}>
                    {members.map((m) => (
                      <li key={m.id}>
                        {m.user.name} · {m.role === "OWNER" ? "Gérant" : m.role === "ADMIN" ? "Responsable" : "Équipe"} ·{" "}
                        {m.user.email}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </form>
            ) : null}

            {canEdit ? (
              <form onSubmit={saveRestaurant} className="card space-y-3">
                <h3 className="text-lg font-semibold">Modifier le restaurant</h3>
                <input
                  className="input"
                  value={editOrgName}
                  onChange={(e) => setEditOrgName(e.target.value)}
                  required
                />
                <div className="flex flex-wrap gap-2">
                  <button className="btn" disabled={saving}>
                    Enregistrer
                  </button>
                  <button type="button" className="btn btn-ghost" onClick={() => setTab("settings")}>
                    Settings · logo & couleurs
                  </button>
                </div>
              </form>
            ) : null}

            {isOwner ? (
              <div className="card space-y-3 border-red-200">
                <h3 className="text-lg font-semibold text-red-800">Zone danger</h3>
                <p className="muted text-sm" style={{ fontFamily: "var(--font-mono)" }}>
                  Supprime l&apos;organisation et toutes ses données (Gérant uniquement).
                </p>
                <button type="button" className="btn" style={{ background: "#b91c1c" }} onClick={deleteRestaurant}>
                  Supprimer le restaurant
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {tab === "menu" ? (
        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          {canEdit ? (
            <div className="space-y-4">
              <form onSubmit={addCategory} className="card space-y-3">
                <h2 className="text-xl font-semibold">Nouvelle catégorie</h2>
                <input
                  className="input"
                  placeholder="Ex. Tajines"
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  required
                />
                <button className="btn" disabled={saving || !categoryName.trim()}>
                  {saving ? "..." : "Ajouter"}
                </button>
              </form>
              <form onSubmit={addItem} className="card space-y-3">
                <h2 className="text-xl font-semibold">Nouveau plat</h2>
                <select
                  className="input"
                  required
                  value={itemCategoryId}
                  onChange={(e) => setItemCategoryId(e.target.value)}
                >
                  <option value="" disabled>
                    Catégorie
                  </option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <input
                  className="input"
                  placeholder="Nom du plat"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  required
                />
                <input
                  className="input"
                  placeholder="Description"
                  value={itemDescription}
                  onChange={(e) => setItemDescription(e.target.value)}
                />
                <input
                  className="input"
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="Prix en DH (ex. 45.00)"
                  value={itemPrice}
                  onChange={(e) => setItemPrice(e.target.value)}
                  required
                />
                <div>
                  <label className="label">Image du plat (optionnel)</label>
                  <input
                    className="input"
                    type="file"
                    accept="image/*"
                    onChange={(e) => setItemImageFile(e.target.files?.[0] ?? null)}
                  />
                </div>
                <button className="btn" disabled={saving || categories.length === 0}>
                  {saving ? "..." : "Ajouter le plat"}
                </button>
              </form>
            </div>
          ) : (
            <div className="card muted">Lecture seule (rôle MEMBER)</div>
          )}

          <div className="space-y-4">
            {categories.length === 0 ? (
              <div className="card muted">Aucune catégorie pour l&apos;instant.</div>
            ) : null}
            {categories.map((cat) => (
              <section key={cat.id} className="card">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-xl font-semibold">{cat.name}</h3>
                  {canEdit ? (
                    <div className="flex gap-2">
                      <button type="button" className="btn btn-ghost" onClick={() => renameCategory(cat.id, cat.name)}>
                        Modifier
                      </button>
                      <button type="button" className="btn btn-ghost" onClick={() => deleteCategory(cat.id, cat.name)}>
                        Supprimer
                      </button>
                    </div>
                  ) : null}
                </div>
                <ul className="mt-3 space-y-2" style={{ fontFamily: "var(--font-mono)" }}>
                  {cat.items.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-start justify-between gap-3 border-b border-[var(--line)] pb-2"
                    >
                      <div className="flex min-w-0 items-start gap-3">
                        {item.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="h-12 w-12 shrink-0 rounded-lg object-cover"
                          />
                        ) : null}
                        <div>
                          <div className="font-semibold" style={{ fontFamily: "var(--font-display)" }}>
                            {item.name}
                          </div>
                          {item.description ? (
                            <div className="muted text-sm">{item.description}</div>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <div className="whitespace-nowrap font-semibold">
                          {formatMoney(item.priceCents)}
                        </div>
                        {canEdit ? (
                          <div className="flex gap-1">
                            <button type="button" className="btn btn-ghost px-2 py-1 text-xs" onClick={() => editItem(item)}>
                              Modif
                            </button>
                            <button type="button" className="btn btn-ghost px-2 py-1 text-xs" onClick={() => deleteItem(item)}>
                              Suppr
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </li>
                  ))}
                  {cat.items.length === 0 ? <li className="muted text-sm">Aucun plat</li> : null}
                </ul>
              </section>
            ))}
          </div>
        </div>
      ) : null}

      {tab === "tables" ? (
        <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          {canEdit ? (
            <form onSubmit={addTable} className="card h-fit space-y-3">
              <h2 className="text-xl font-semibold">Nouvelle table</h2>
              <input
                className="input"
                placeholder="Ex. Table 12"
                value={tableName}
                onChange={(e) => setTableName(e.target.value)}
                required
              />
              <button className="btn" disabled={saving || !tableName.trim()}>
                {saving ? "..." : "Générer QR"}
              </button>
            </form>
          ) : (
            <div className="card muted">Lecture seule</div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            {tables.map((table) => {
              const url = `${origin || ""}/o/${slug}/t/${table.token}`;
              return (
                <article key={table.id} className="card text-center">
                  <h3 className="text-lg font-semibold">{table.name}</h3>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={qrImageUrl(url)}
                    alt={`QR ${table.name}`}
                    className="mx-auto mt-3 rounded-xl bg-white p-2"
                    width={180}
                    height={180}
                  />
                  <p className="muted mt-2 break-all text-xs" style={{ fontFamily: "var(--font-mono)" }}>
                    {url}
                  </p>
                  <div className="mt-3 flex flex-wrap justify-center gap-2">
                    <a className="btn btn-ghost" href={url} target="_blank" rel="noreferrer">
                      Menu client
                    </a>
                    {canEdit ? (
                      <>
                        <button type="button" className="btn btn-ghost" onClick={() => renameTable(table)}>
                          Modifier
                        </button>
                        <button type="button" className="btn btn-ghost" onClick={() => deleteTable(table)}>
                          Supprimer
                        </button>
                      </>
                    ) : null}
                  </div>
                </article>
              );
            })}
            {tables.length === 0 ? <div className="card muted">Aucune table.</div> : null}
          </div>
        </div>
      ) : null}
    </RestaurantShell>
  );
}
