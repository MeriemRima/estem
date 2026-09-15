"use client";

import Link from "next/link";
import { ReactNode } from "react";
import { Branding, brandingStyle, displayBrandName } from "@/lib/branding";
import { useI18n } from "@/lib/i18n/i18n-context";
import { LanguageSwitcher } from "@/components/language-switcher";

export type RestaurantNavId = "admin" | "menu" | "tables" | "kitchen" | "settings";

type Props = {
  orgId: string;
  orgName: string;
  branding: Branding;
  active: RestaurantNavId;
  backHref?: string;
  backLabel?: string;
  roleLabel: string;
  slug: string;
  pendingOrders?: number;
  headerActions?: ReactNode;
  onNavigate?: (id: RestaurantNavId) => void;
  children: ReactNode;
};

export function RestaurantShell({
  orgId,
  orgName,
  branding,
  active,
  backHref,
  backLabel,
  roleLabel,
  slug,
  pendingOrders = 0,
  headerActions,
  onNavigate,
  children,
}: Props) {
  const { t, isRtl, dir } = useI18n();
  const title = displayBrandName(orgName, branding.brandName);

  function itemClass(id: RestaurantNavId) {
    return `block w-full rounded-xl px-3 py-2.5 text-left rtl:text-right text-sm font-semibold transition ${
      active === id ? "text-white" : ""
    }`;
  }

  function itemStyle(id: RestaurantNavId) {
    return active === id ? { background: "var(--brand)" } : undefined;
  }

  const navItems: [RestaurantNavId, string][] = [
    ["admin", t.nav.space],
    ["menu", t.nav.menu],
    ["tables", t.nav.tablesAndQr],
  ];

  return (
    <div style={brandingStyle(branding)} dir={dir} className={isRtl ? "rtl" : ""}>
      <div className="mx-auto flex min-h-screen w-full max-w-6xl gap-5 px-4 py-6 md:gap-6 md:px-6">
        <aside className="flex w-40 shrink-0 flex-col gap-3 sm:w-48 md:w-52">
          <div className="card !p-3">
            <div className="mb-3 flex items-center gap-2">
              {branding.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={branding.logoUrl} alt="" className="h-10 w-10 rounded-lg object-cover" />
              ) : (
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-lg text-xs font-bold text-white"
                  style={{ background: "var(--brand)" }}
                >
                  {title.slice(0, 1).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">{title}</div>
                <div className="muted truncate text-[10px]" style={{ fontFamily: "var(--font-mono)" }}>
                  /{slug}
                </div>
              </div>
            </div>

            <nav className="flex flex-col gap-1">
              {navItems.map(([id, label]) =>
                onNavigate ? (
                  <button
                    key={id}
                    type="button"
                    className={itemClass(id)}
                    style={itemStyle(id)}
                    onClick={() => onNavigate(id)}
                  >
                    {label}
                  </button>
                ) : (
                  <Link
                    key={id}
                    href={`/dashboard/${orgId}${id === "admin" ? "" : `?tab=${id}`}`}
                    className={itemClass(id)}
                    style={itemStyle(id)}
                  >
                    {label}
                  </Link>
                ),
              )}

              <Link
                href={`/dashboard/${orgId}/kitchen`}
                className={itemClass("kitchen")}
                style={itemStyle("kitchen")}
              >
                {t.nav.orders}
                {pendingOrders > 0 ? (
                  <span className="mx-1 rounded-full bg-white/25 px-1.5 text-xs">
                    {pendingOrders}
                  </span>
                ) : null}
              </Link>
            </nav>
          </div>

          {/* Settings button */}
          <div
            className="overflow-hidden rounded-2xl border bg-[var(--card)] shadow-sm"
            style={{ borderColor: "var(--line)" }}
          >
            <div className="h-1" style={{ background: "var(--brand)" }} />
            {onNavigate ? (
              <button
                type="button"
                className={itemClass("settings")}
                style={{
                  ...itemStyle("settings"),
                  borderRadius: 0,
                  width: "100%",
                }}
                onClick={() => onNavigate("settings")}
              >
                ⚙ {t.nav.settings}
                <span
                  className={`mt-0.5 block text-[11px] font-normal ${
                    active === "settings" ? "text-white/80" : "opacity-70"
                  }`}
                >
                  {t.nav.settingsSubtitle}
                </span>
              </button>
            ) : (
              <Link
                href={`/dashboard/${orgId}?tab=settings`}
                className={itemClass("settings")}
                style={{ ...itemStyle("settings"), borderRadius: 0 }}
              >
                ⚙ {t.nav.settings}
                <span
                  className={`mt-0.5 block text-[11px] font-normal ${
                    active === "settings" ? "text-white/80" : "opacity-70"
                  }`}
                >
                  {t.nav.settingsSubtitle}
                </span>
              </Link>
            )}
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
            <div>
              {backHref && backLabel ? (
                <Link href={backHref} className="muted text-sm" style={{ fontFamily: "var(--font-mono)" }}>
                  {isRtl ? `${backLabel} →` : `← ${backLabel}`}
                </Link>
              ) : null}
              <h1 className="text-3xl font-semibold">{title}</h1>
              <p className="muted" style={{ fontFamily: "var(--font-mono)" }}>
                {roleLabel} · {pendingOrders} {t.nav.activeOrders} · {t.common.currency}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <LanguageSwitcher variant="dropdown" />
              {headerActions}
            </div>
          </header>
          {children}
        </div>
      </div>
    </div>
  );
}
