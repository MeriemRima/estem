"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/i18n-context";
import { LanguageSwitcher } from "@/components/language-switcher";
import { LogoutButton } from "@/components/logout-button";

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
  userEmail,
}: {
  initialOrgs: OrgRow[];
  initialStats: Stats;
  userEmail?: string;
}) {

  const router = useRouter();
  const { t, isRtl, dir } = useI18n();
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
        setError(data.error || t.common.error);
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
        setError(data.error || t.common.error);
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
    if (!window.confirm(`${t.superAdmin.resetManagerPassword} : ${org.owner.email} ?`)) return;
    setError("");
    const res = await fetch(`/api/vendeur/restaurants/${org.id}/owner`, {
      method: "PUT",
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || t.common.error);
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
    <div dir={dir} className={`space-y-8 ${isRtl ? "rtl text-right" : ""}`}>
      <header className="overflow-hidden rounded-[1.75rem] border border-[var(--line)] bg-[var(--card)] px-6 py-7 shadow-[0_16px_48px_rgba(28,25,23,0.07)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="muted text-sm uppercase tracking-[0.22em]">{t.pages.vendeurBadge}</p>
            <h1 className="mt-1 text-4xl font-semibold tracking-tight">{t.roles.vendeur}</h1>
            <p className="muted mt-2 max-w-xl text-sm" style={{ fontFamily: "var(--font-mono)" }}>
              {t.pages.vendeurSubtitle}
            </p>
            {userEmail ? (
              <p className="muted mt-3 text-xs" style={{ fontFamily: "var(--font-mono)" }}>
                {t.pages.connectedAs} · {userEmail}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <LanguageSwitcher variant="dropdown" />
            <LogoutButton />
          </div>
        </div>
      </header>

      {/* Stats Cards */}

      <section className="grid gap-3 sm:grid-cols-3">
        {[
          [t.vendeur.statRestaurants, stats.restaurants, t.vendeur.statRestaurantsHint],
          [t.orgDashboard.statsPlats, stats.dishes, t.orgDashboard.allDishes],
          [t.kitchen.liveOrders, stats.activeOrders, t.kitchen.autoRefresh],
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
            <p className="muted text-xs uppercase tracking-[0.16em]">{t.vendeur.createRestaurantTitle}</p>
            <h2 className="mt-1 text-2xl font-semibold">{t.superAdmin.createRestaurantTitle}</h2>
            <p className="muted mt-1 text-sm" style={{ fontFamily: "var(--font-mono)" }}>
              {t.vendeur.createRestaurantSubtitle}
            </p>
          </div>

          <input className="input" name="restaurantName" placeholder={t.superAdmin.restaurantName} required />

          <div className="pt-2">
            <p className="text-xs uppercase tracking-[0.14em] font-semibold mb-2 opacity-70">
              {t.superAdmin.managerLabel}
            </p>
            <div className="space-y-3">
              <input className="input" name="ownerName" placeholder={t.superAdmin.managerName} />
              <input className="input" name="ownerEmail" type="email" placeholder={t.superAdmin.managerEmail} />
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <label className="label mb-0" htmlFor="ownerPassword">
                    {t.superAdmin.provisionalPassword}
                  </label>
                  <button
                    type="button"
                    className="text-xs font-semibold underline opacity-70"
                    onClick={() => setProvisionalPassword(suggestPassword())}
                  >
                    {t.superAdmin.generatePassword}
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
              <div className="font-semibold">{t.superAdmin.managerAccountCreated}</div>
              <p className="opacity-80" style={{ fontFamily: "var(--font-mono)" }}>
                {createdCred.restaurant}
                {createdCred.email ? (
                  <>
                    <br />
                    {t.superAdmin.managerLabel} : {createdCred.email}
                    <br />
                    {t.superAdmin.provisionalPassword} : {createdCred.password}
                  </>
                ) : null}
              </p>
              <Link href={`/dashboard/${createdCred.orgId}`} className="btn mt-2 inline-block">
                {t.settings.title}
              </Link>
            </div>
          ) : null}

          <button className="btn w-full" disabled={loading}>
            {loading ? t.common.loading : t.superAdmin.createRestaurantButton}
          </button>
        </form>

        {/* Restaurants List */}
        <section className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="muted text-xs uppercase tracking-[0.16em]">{t.vendeur.myPortfolio}</p>
              <h2 className="text-2xl font-semibold">{t.vendeur.statRestaurants}</h2>
            </div>
            <input
              className="input max-w-xs"
              placeholder={t.vendeur.searchPortfolioPlaceholder}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          {filtered.length === 0 ? (
            <div className="rounded-[1.35rem] border border-dashed border-[var(--line)] bg-[var(--card)] p-8 text-center">
              <p className="muted">{t.vendeur.noRestaurantsInPortfolio}</p>
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
              <div className="font-semibold">{t.superAdmin.resetSuccessTitle}</div>
              <p className="mt-1 opacity-80" style={{ fontFamily: "var(--font-mono)" }}>
                {resetCred.restaurant}
                <br />
                {resetCred.email}
                <br />
                {t.superAdmin.provisionalPassword} : {resetCred.password}
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
                      /{org.slug} · {org.counts.items} {t.customerMenu.dishes} · {org.counts.tables} {t.customerMenu.tables} ·{" "}
                      {org.counts.orders} {t.customerMenu.orders}
                    </p>

                    <div className="mt-3 rounded-xl bg-[rgba(194,65,12,0.06)] px-3 py-2 text-sm">
                      <div className="text-xs uppercase tracking-[0.14em] opacity-55">{t.superAdmin.managerLabel}</div>
                      {org.owner ? (
                        <div className="mt-0.5 flex items-center justify-between gap-2 flex-wrap">
                          <div>
                            <span className="font-semibold">{org.owner.name}</span>
                            <span className="muted"> · {org.owner.email}</span>
                            {org.owner.mustChangePassword ? (
                              <span className="mx-2 text-xs font-semibold text-amber-800">
                                ({t.superAdmin.provisionalPasswordBadge})
                              </span>
                            ) : null}
                          </div>
                          <button
                            type="button"
                            className="text-xs underline font-semibold text-amber-900"
                            onClick={() => resetOwnerPassword(org)}
                          >
                            {t.superAdmin.resetManagerPassword}
                          </button>
                        </div>
                      ) : (
                        <div className="mt-1 flex items-center justify-between gap-2">
                          <span className="muted text-xs">{t.superAdmin.noManagerAssigned}</span>
                          <button
                            type="button"
                            className="text-xs font-semibold underline text-[var(--brand)]"
                            onClick={() => {
                              setAssigningOrg(org);
                              setAssignOwnerPassword(suggestPassword());
                            }}
                          >
                            + {t.superAdmin.managerLabel}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Link href={`/dashboard/${org.id}`} className="btn">
                      {t.settings.title}
                    </Link>
                    <Link href={`/o/${org.slug}`} target="_blank" className="btn btn-ghost">
                      {t.orgDashboard.openMenu} ↗
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
              <h3 className="text-xl font-semibold">{t.superAdmin.managerLabel}</h3>
              <p className="muted text-sm" style={{ fontFamily: "var(--font-mono)" }}>
                {assigningOrg.name}
              </p>
            </div>
            <form onSubmit={handleAssignOwner} className="space-y-3">
              <input className="input" name="ownerName" placeholder={t.superAdmin.managerName} required />
              <input className="input" name="ownerEmail" type="email" placeholder={t.superAdmin.managerEmail} required />
              <div className="space-y-1">
                <label className="text-xs font-semibold opacity-70">{t.superAdmin.provisionalPassword}</label>
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
                  {t.common.cancel}
                </button>
                <button className="btn" disabled={loading}>
                  {loading ? t.common.loading : t.common.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
