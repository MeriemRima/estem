"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatMoney, qrImageUrl } from "@/lib/utils";
import { Branding, normalizeBranding } from "@/lib/branding";
import { RestaurantSettings } from "@/components/restaurant-settings";
import { RestaurantShell, RestaurantNavId } from "@/components/restaurant-shell";
import { LogoutButton } from "@/components/logout-button";
import { EditDishModal } from "@/components/edit-dish-modal";
import { EditCategoryModal } from "@/components/edit-category-modal";
import { QrPrintModal } from "@/components/qr-print-modal";
import { useI18n } from "@/lib/i18n/i18n-context";
import { roleLabel } from "@/lib/roles";
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
  isPlatformAdmin?: boolean;
  isVendeur?: boolean;
  canCustomize?: boolean;
  initialCategories: Category[];
  initialTables: Table[];
  initialStats: Stats;
  initialBranding: Branding;
  backHref?: string;
  backLabel?: string;
  roleLabel?: string;
  initialTab?: RestaurantNavId;
};

export function OrgDashboard({
  orgId,
  orgName: initialOrgName,
  slug,
  role,
  isPlatformAdmin,
  isVendeur,
  canCustomize = false,
  initialCategories,
  initialTables,
  initialStats,
  initialBranding,
  backHref,
  backLabel,
  roleLabel: roleLabelProp,
  initialTab = "admin",
}: Props) {
  const router = useRouter();
  const { t, isRtl, dir } = useI18n();
  const canEdit = canCustomize;
  const isOwner = role === "OWNER";
  const displayRole = roleLabel(role, isPlatformAdmin, isVendeur, t) || roleLabelProp || role;
  const displayBackLabel = backHref
    ? isPlatformAdmin
      ? t.roles.platformAdmin
      : isVendeur
      ? t.pages.vendeurSpace
      : backLabel
    : undefined;

  const [tab, setTab] = useState<RestaurantNavId>(
    initialTab === "kitchen" ? "admin" : initialTab,
  );
  const [categories, setCategories] = useState(initialCategories);
  const [tables, setTables] = useState(initialTables);
  const [stats, setStats] = useState(initialStats);
  const [orgName, setOrgName] = useState(initialOrgName);
  const [branding, setBranding] = useState(normalizeBranding(initialBranding));
  const [error, setError] = useState("");
  const [origin] = useState(() => (typeof window !== "undefined" ? window.location.origin : ""));
  const [saving, setSaving] = useState(false);

  const [categoryName, setCategoryName] = useState("");
  const [itemCategoryId, setItemCategoryId] = useState("");
  const [itemName, setItemName] = useState("");
  const [itemDescription, setItemDescription] = useState("");
  const [itemPrice, setItemPrice] = useState("");
  const [itemImageFile, setItemImageFile] = useState<File | null>(null);
  const [tableName, setTableName] = useState("");
  const [tableMode, setTableMode] = useState<"single" | "bulk">("single");
  const [bulkCount, setBulkCount] = useState("10");
  const [bulkPrefix, setBulkPrefix] = useState("Table");
  const [editOrgName, setEditOrgName] = useState(initialOrgName);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [invitePassword, setInvitePassword] = useState("");
  const [inviteRole, setInviteRole] = useState<"ADMIN" | "MEMBER">("ADMIN");
  const [members, setMembers] = useState<
    { id: string; role: string; user: { name: string; email: string } }[]
  >([]);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [editingCategory, setEditingCategory] = useState<{ id: string; name: string } | null>(null);
  const [showPrintModal, setShowPrintModal] = useState(false);

  const nextTableNumber = useMemo(() => {
    let highest = 0;
    for (const t of tables) {
      const match = t.name.match(/(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > highest) highest = num;
      }
    }
    return highest > 0 ? highest + 1 : tables.length + 1;
  }, [tables]);

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
        setError(data.error || t.common.error);
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

  function renameCategory(categoryId: string, current: string) {
    setEditingCategory({ id: categoryId, name: current });
  }

  async function deleteCategory(categoryId: string, name: string) {
    if (!window.confirm(t.orgDashboard.deleteCategoryPrompt.replace("{name}", name))) return;
    const res = await fetch(`/api/orgs/${orgId}/categories/${categoryId}`, { method: "DELETE" });
    if (!res.ok) {
      setError(t.common.error);
      return;
    }
    await refresh();
  }

  async function addItem(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (saving) return;
    const price = Number(itemPrice);
    if (!itemCategoryId || !itemName.trim() || !Number.isFinite(price) || price <= 0) {
      setError(t.orgDashboard.dishFillProperly);
      return;
    }
    setSaving(true);
    setError("");
    try {
      let imageUrl = "";
      try {
        imageUrl = await uploadImage();
      } catch {
        setError(t.orgDashboard.dishUploadFailed);
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
        setError(t.common.error);
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
        setError(data.error || t.common.error);
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

  function editItem(item: Item) {
    setEditingItem(item);
  }

  async function deleteItem(item: Item) {
    if (!window.confirm(t.orgDashboard.deleteDishConfirm.replace("{name}", item.name))) return;
    const res = await fetch(`/api/orgs/${orgId}/items/${item.id}`, { method: "DELETE" });
    if (!res.ok) {
      setError(t.common.error);
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
        setError(t.common.error);
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

  async function addBulkTables(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const count = parseInt(bulkCount, 10);
    if (isNaN(count) || count < 1 || count > 100 || saving) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/orgs/${orgId}/tables`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          count,
          prefix: bulkPrefix.trim() || t.orgDashboard.prefixPlaceholder,
          startFrom: nextTableNumber,
        }),
      });
      if (!res.ok) {
        setError(t.common.error);
        return;
      }
      const created: Table[] = await res.json();
      setTables((prev) => [...prev, ...created]);
      setStats((s) => ({ ...s, tables: s.tables + created.length }));
    } finally {
      setSaving(false);
    }
  }

  async function renameTable(table: Table) {
    const name = window.prompt(t.orgDashboard.renameTablePrompt, table.name)?.trim();
    if (!name || name === table.name) return;
    const res = await fetch(`/api/orgs/${orgId}/tables/${table.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) {
      setError(t.common.error);
      return;
    }
    await refresh();
  }

  async function deleteTable(table: Table) {
    if (!window.confirm(t.orgDashboard.deleteTablePrompt.replace("{name}", table.name))) return;
    const res = await fetch(`/api/orgs/${orgId}/tables/${table.id}`, { method: "DELETE" });
    if (!res.ok) {
      setError(t.common.error);
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
        setError(t.common.error);
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
        t.orgDashboard.deleteRestoConfirm.replace("{name}", orgName),
      )
    ) {
      return;
    }
    const res = await fetch(`/api/orgs/${orgId}`, { method: "DELETE" });
    if (!res.ok) {
      setError(t.common.error);
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
      backLabel={displayBackLabel}
      roleLabel={displayRole}
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
            {t.dashboardPicker.viewOrders}
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
              <h2 className="text-xl font-semibold">{t.orgDashboard.adminView} — {orgName}</h2>
              <p className="muted mt-1 text-sm" style={{ fontFamily: "var(--font-mono)" }}>
                Multi-tenant · {role === "OWNER" ? t.roles.owner : role === "ADMIN" ? t.roles.admin : role} · /{slug} · {t.common.currency}
              </p>
              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {[
                  [t.orgDashboard.statsCategories, stats.categories],
                  [t.orgDashboard.statsDishes, stats.items],
                  [t.orgDashboard.statsTables, stats.tables],
                  [t.orgDashboard.statsOrders, stats.orders],
                  [t.orgDashboard.statsActive, stats.activeOrders],
                ].map(([label, value]) => (
                  <div key={label as string} className="rounded-2xl bg-[rgba(194,65,12,0.08)] p-4">
                    <div className="muted text-xs uppercase tracking-wide">{label}</div>
                    <div className="mt-1 text-2xl font-semibold">{value}</div>
                  </div>
                ))}
              </div>
            </section>

            <section className="card space-y-3">
              <h3 className="text-lg font-semibold">{t.orgDashboard.architectureTitle}</h3>
              <ol className="space-y-2 text-sm" style={{ fontFamily: "var(--font-mono)" }}>
                <li>{t.orgDashboard.step1}</li>
                <li>{t.orgDashboard.step2}</li>
                <li>{t.orgDashboard.step3}</li>
                <li>{t.orgDashboard.step4}</li>
                <li>{t.orgDashboard.step5}</li>
              </ol>
              <div className="flex flex-wrap gap-2 pt-2">
                <button type="button" className="btn" onClick={() => setTab("menu")}>
                  {t.orgDashboard.manageMenuBtn}
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => setTab("tables")}>
                  {t.orgDashboard.manageTablesBtn}
                </button>
              </div>
            </section>
          </div>

          <div className="space-y-4">
            {canEdit ? (
              <form onSubmit={inviteMember} className="card space-y-3">
                <h3 className="text-lg font-semibold">{t.orgDashboard.inviteTeamTitle}</h3>
                <p className="muted text-sm" style={{ fontFamily: "var(--font-mono)" }}>
                  {t.orgDashboard.inviteTeamSubtitle}
                </p>
                <input
                  className="input"
                  placeholder={t.orgDashboard.namePlaceholder}
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  required
                />
                <input
                  className="input"
                  type="email"
                  placeholder={t.orgDashboard.emailPlaceholder}
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  required
                />
                <input
                  className="input"
                  type="password"
                  placeholder={t.orgDashboard.provisionalPassword}
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
                  <option value="ADMIN">{t.orgDashboard.roleAdminOption}</option>
                  <option value="MEMBER">{t.orgDashboard.roleMemberOption}</option>
                </select>
                <button className="btn" disabled={saving}>
                  {t.orgDashboard.inviteButton}
                </button>
                {members.length > 0 ? (
                  <ul className="space-y-1 pt-2 text-sm" style={{ fontFamily: "var(--font-mono)" }}>
                    {members.map((m) => (
                      <li key={m.id}>
                        {m.user.name} · {m.role === "OWNER" ? t.roles.owner : m.role === "ADMIN" ? t.roles.admin : t.roles.member} ·{" "}
                        {m.user.email}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </form>
            ) : null}

            {canEdit ? (
              <form onSubmit={saveRestaurant} className="card space-y-3">
                <h3 className="text-lg font-semibold">{t.orgDashboard.editRestoTitle}</h3>
                <input
                  className="input"
                  value={editOrgName}
                  onChange={(e) => setEditOrgName(e.target.value)}
                  required
                />
                <div className="flex flex-wrap gap-2">
                  <button className="btn" disabled={saving}>
                    {t.common.save}
                  </button>
                  <button type="button" className="btn btn-ghost" onClick={() => setTab("settings")}>
                    {t.orgDashboard.saveSettingsPrompt}
                  </button>
                </div>
              </form>
            ) : null}

            {isOwner ? (
              <div className="card space-y-3 border-red-200">
                <h3 className="text-lg font-semibold text-red-800">{t.orgDashboard.dangerZoneTitle}</h3>
                <p className="muted text-sm" style={{ fontFamily: "var(--font-mono)" }}>
                  {t.orgDashboard.dangerZoneSubtitle}
                </p>
                <button type="button" className="btn" style={{ background: "#b91c1c" }} onClick={deleteRestaurant}>
                  {t.orgDashboard.deleteRestoButton}
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
                <h2 className="text-xl font-semibold">{t.orgDashboard.newCategoryTitle}</h2>
                <input
                  className="input"
                  placeholder={t.orgDashboard.categoryPlaceholder}
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  required
                />
                <button className="btn" disabled={saving || !categoryName.trim()}>
                  {saving ? "..." : t.orgDashboard.addCategoryButton}
                </button>
              </form>
              <form onSubmit={addItem} className="card space-y-3">
                <h2 className="text-xl font-semibold">{t.orgDashboard.newDishTitle}</h2>
                <select
                  className="input"
                  required
                  value={itemCategoryId}
                  onChange={(e) => setItemCategoryId(e.target.value)}
                >
                  <option value="" disabled>
                    {t.orgDashboard.categorySelectDefault}
                  </option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <input
                  className="input"
                  placeholder={t.orgDashboard.dishNamePlaceholder}
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  required
                />
                <input
                  className="input"
                  placeholder={t.orgDashboard.dishDescPlaceholder}
                  value={itemDescription}
                  onChange={(e) => setItemDescription(e.target.value)}
                />
                <input
                  className="input"
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder={t.orgDashboard.dishPricePlaceholder}
                  value={itemPrice}
                  onChange={(e) => setItemPrice(e.target.value)}
                  required
                />
                <div>
                  <label className="label">{t.orgDashboard.dishImageLabel}</label>
                  <input
                    className="input"
                    type="file"
                    accept="image/*"
                    onChange={(e) => setItemImageFile(e.target.files?.[0] ?? null)}
                  />
                </div>
                <button className="btn" disabled={saving || categories.length === 0}>
                  {saving ? "..." : t.orgDashboard.addDishButton}
                </button>
              </form>
            </div>
          ) : (
            <div className="card muted text-sm font-semibold">
              {t.orgDashboard.vendorOnlyNotice}
            </div>
          )}

          <div className="space-y-4">
            {categories.length === 0 ? (
              <div className="card muted">{t.orgDashboard.noCategories}</div>
            ) : null}
            {categories.map((cat) => (
              <section key={cat.id} className="card">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-xl font-semibold">{cat.name}</h3>
                  {canEdit ? (
                    <div className="flex gap-2">
                      <button type="button" className="btn btn-ghost" onClick={() => renameCategory(cat.id, cat.name)}>
                        {t.orgDashboard.editAction}
                      </button>
                      <button type="button" className="btn btn-ghost" onClick={() => deleteCategory(cat.id, cat.name)}>
                        {t.orgDashboard.deleteAction}
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
                              {t.orgDashboard.editAction}
                            </button>
                            <button type="button" className="btn btn-ghost px-2 py-1 text-xs" onClick={() => deleteItem(item)}>
                              {t.orgDashboard.deleteAction}
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </li>
                  ))}
                  {cat.items.length === 0 ? <li className="muted text-sm">{t.orgDashboard.noDishesInCategory}</li> : null}
                </ul>
              </section>
            ))}
          </div>
        </div>
      ) : null}

      {tab === "tables" ? (
        <div className="space-y-6">
          <div className="card flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">{t.orgDashboard.tablesAndQrTitle}</h2>
              <p className="muted text-sm" style={{ fontFamily: "var(--font-mono)" }}>
                {tables.length} {t.orgDashboard.statsTables} · {t.orgDashboard.tableReadyHint}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowPrintModal(true)}
              disabled={tables.length === 0}
              className="btn flex items-center gap-2 shadow-sm"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                />
              </svg>
              {t.orgDashboard.printQrButton}
            </button>
          </div>

          <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          {canEdit ? (
            <div className="card h-fit space-y-4">
              <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: "var(--line)" }}>
                <h2 className="text-lg font-semibold">{t.orgDashboard.addTable}</h2>
                <div className="flex rounded-full bg-[rgba(0,0,0,0.06)] p-0.5 text-xs font-medium">
                  <button
                    type="button"
                    onClick={() => setTableMode("single")}
                    className={`rounded-full px-3 py-1 transition ${
                      tableMode === "single"
                        ? "bg-white text-stone-900 shadow-sm font-semibold"
                        : "text-stone-600 hover:text-stone-900"
                    }`}
                  >
                    {t.orgDashboard.modeSingle}
                  </button>
                  <button
                    type="button"
                    onClick={() => setTableMode("bulk")}
                    className={`rounded-full px-3 py-1 transition ${
                      tableMode === "bulk"
                        ? "bg-white text-stone-900 shadow-sm font-semibold"
                        : "text-stone-600 hover:text-stone-900"
                    }`}
                  >
                    {t.orgDashboard.modeBulk}
                  </button>
                </div>
              </div>

              {tableMode === "single" ? (
                <form onSubmit={addTable} className="space-y-3">
                  <div>
                    <label className="label">{t.orgDashboard.tableNamePlaceholder}</label>
                    <input
                      className="input"
                      placeholder={t.orgDashboard.singleTablePlaceholder}
                      value={tableName}
                      onChange={(e) => setTableName(e.target.value)}
                      required
                    />
                  </div>
                  <button className="btn w-full" disabled={saving || !tableName.trim()}>
                    {saving ? "..." : t.orgDashboard.generateQrButton}
                  </button>
                </form>
              ) : (
                <form onSubmit={addBulkTables} className="space-y-3">
                  <div>
                    <label className="label">{t.orgDashboard.howManyTables}</label>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      className="input"
                      placeholder="Ex. 10"
                      value={bulkCount}
                      onChange={(e) => setBulkCount(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="label">{t.orgDashboard.prefixLabel}</label>
                    <input
                      className="input"
                      placeholder={t.orgDashboard.prefixPlaceholder}
                      value={bulkPrefix}
                      onChange={(e) => setBulkPrefix(e.target.value)}
                    />
                  </div>

                  {parseInt(bulkCount, 10) > 0 ? (
                    <div className="rounded-xl bg-[rgba(194,65,12,0.08)] p-3 text-xs leading-relaxed text-stone-700">
                      <span className="font-semibold text-orange-800">{t.orgDashboard.previewLabel} : </span>
                      {t.orgDashboard.previewBulk
                        .replace("{count}", bulkCount)
                        .replace("{start}", `${bulkPrefix.trim() || t.orgDashboard.prefixPlaceholder} ${String(nextTableNumber).padStart(2, "0")}`)
                        .replace("{end}", `${bulkPrefix.trim() || t.orgDashboard.prefixPlaceholder} ${String(nextTableNumber + parseInt(bulkCount, 10) - 1).padStart(
                          Math.max(2, String(nextTableNumber + parseInt(bulkCount, 10) - 1).length),
                          "0",
                        )}`)}
                    </div>
                  ) : null}

                  <button
                    className="btn w-full flex items-center justify-center gap-2"
                    disabled={saving || !bulkCount || parseInt(bulkCount, 10) < 1}
                  >
                    {saving
                      ? t.orgDashboard.generatingTables
                      : t.orgDashboard.generateBulkButton.replace("{count}", bulkCount || "")}
                  </button>
                </form>
              )}
            </div>
          ) : (
            <div className="card muted">{t.orgDashboard.readOnly}</div>
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
                      {t.orgDashboard.customerMenuLink}
                    </a>
                    {canEdit ? (
                      <>
                        <button type="button" className="btn btn-ghost" onClick={() => renameTable(table)}>
                          {t.orgDashboard.editAction}
                        </button>
                        <button type="button" className="btn btn-ghost" onClick={() => deleteTable(table)}>
                          {t.orgDashboard.deleteAction}
                        </button>
                      </>
                    ) : null}
                  </div>
                </article>
              );
            })}
            {tables.length === 0 ? <div className="card muted">{t.orgDashboard.noTables}</div> : null}
          </div>
        </div>
        </div>
      ) : null}
      {editingItem ? (
        <EditDishModal
          orgId={orgId}
          item={editingItem}
          categories={categories}
          onClose={() => setEditingItem(null)}
          onSuccess={async () => {
            await refresh();
          }}
        />
      ) : null}

      {editingCategory ? (
        <EditCategoryModal
          orgId={orgId}
          category={editingCategory}
          onClose={() => setEditingCategory(null)}
          onSuccess={async () => {
            await refresh();
          }}
        />
      ) : null}

      {showPrintModal ? (
        <QrPrintModal
          tables={tables}
          branding={branding}
          slug={slug}
          origin={origin}
          onClose={() => setShowPrintModal(false)}
        />
      ) : null}
    </RestaurantShell>
  );
}
