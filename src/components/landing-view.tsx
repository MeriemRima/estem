"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n/i18n-context";
import { LanguageSwitcher } from "@/components/language-switcher";

export function LandingView() {
  const { t, isRtl, dir } = useI18n();

  return (
    <main dir={dir} className={`mx-auto flex min-h-screen w-full max-w-5xl flex-col px-6 py-10 ${isRtl ? "rtl text-right" : ""}`}>
      <header className="flex items-center justify-between">
        <div className="text-2xl font-semibold tracking-tight">Estem</div>
        <div className="flex items-center gap-3">
          <LanguageSwitcher variant="segmented" />
          <Link href="/login" className="btn">
            {t.auth.login}
          </Link>
        </div>
      </header>

      <section className="mt-20 grid gap-10 md:grid-cols-[1.2fr_0.8fr] md:items-end">
        <div>
          <p className="muted mb-3 text-sm uppercase tracking-[0.2em]">{t.landing.badge}</p>
          <h1 className="max-w-xl text-5xl leading-tight font-semibold md:text-6xl">
            {t.landing.heroTitle}
          </h1>
          <p className="muted mt-5 max-w-lg text-lg" style={{ fontFamily: "var(--font-mono)" }}>
            {t.landing.heroSubtitle}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/login" className="btn">
              {t.auth.loginButton}
            </Link>
          </div>
        </div>
        <div className="card space-y-4">
          <div>
            <div className="text-sm muted">{t.landing.workflowTitle}</div>
            <ol className="mt-2 space-y-2 text-base" style={{ fontFamily: "var(--font-mono)" }}>
              <li>{t.landing.step1}</li>
              <li>{t.landing.step2}</li>
              <li>{t.landing.step3}</li>
              <li>{t.landing.step4}</li>
            </ol>
          </div>
          <div className="rounded-2xl bg-[rgba(194,65,12,0.08)] p-4 text-sm" style={{ fontFamily: "var(--font-mono)" }}>
            {t.landing.techPill}
          </div>
        </div>
      </section>
    </main>
  );
}
