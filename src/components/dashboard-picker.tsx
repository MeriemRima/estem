"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n/i18n-context";
import { LogoutButton } from "@/components/logout-button";
import { LanguageSwitcher } from "@/components/language-switcher";
import { roleLabel } from "@/lib/roles";

type Membership = {
  id: string;
  role: string;
  organizationId: string;
  organization: {
    name: string;
    slug: string;
  };
};

export function DashboardPicker({
  userName,
  memberships,
}: {
  userName: string;
  memberships: Membership[];
}) {
  const { t, isRtl, dir } = useI18n();
  const empty = memberships.length === 0;

  return (
    <main dir={dir} className={`mx-auto min-h-screen w-full max-w-3xl px-6 py-10 ${isRtl ? "rtl text-right" : ""}`}>
      <header className="mb-10 flex items-center justify-between">
        <div>
          <div className="text-2xl font-semibold">Estem</div>
          <p className="muted" style={{ fontFamily: "var(--font-mono)" }}>
            {t.dashboardPicker.greeting} {userName}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <LanguageSwitcher variant="dropdown" />
          <LogoutButton />
        </div>
      </header>

      {empty ? (
        <section className="space-y-4">
          <h1 className="text-3xl font-semibold">{t.dashboardPicker.noOrgTitle}</h1>
          <p className="muted max-w-md" style={{ fontFamily: "var(--font-mono)" }}>
            {t.dashboardPicker.noOrgSubtitle}
          </p>
        </section>
      ) : (
        <section>
          <h1 className="mb-6 text-3xl font-semibold">{t.dashboardPicker.yourSpace}</h1>
          <div className="grid gap-3">
            {memberships.map((m) => (
              <div key={m.id} className="card">
                <div className="text-xl font-semibold">{m.organization.name}</div>
                <div className="muted text-sm" style={{ fontFamily: "var(--font-mono)" }}>
                  {roleLabel(m.role, false, false, t)} · /{m.organization.slug}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link href={`/dashboard/${m.organizationId}/kitchen`} className="btn">
                    {t.dashboardPicker.viewOrders}
                  </Link>
                  {(m.role === "OWNER" || m.role === "ADMIN") && (
                    <Link href={`/dashboard/${m.organizationId}`} className="btn btn-ghost">
                      {t.dashboardPicker.manageResto}
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
