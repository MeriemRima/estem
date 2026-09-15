"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { useI18n } from "@/lib/i18n/i18n-context";
import { LanguageSwitcher } from "@/components/language-switcher";

export default function SignupPage() {
  const router = useRouter();
  const { t, isRtl, dir } = useI18n();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        email: form.get("email"),
        password: form.get("password"),
        restaurantName: form.get("restaurantName"),
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || t.common.error);
      return;
    }
    router.push(`/dashboard/${data.organizationId}`);
    router.refresh();
  }

  return (
    <main dir={dir} className={`mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-10 ${isRtl ? "rtl" : ""}`}>
      <div className="mb-8 flex items-center justify-between">
        <Link href="/" className="text-2xl font-semibold">
          Estem
        </Link>
        <LanguageSwitcher variant="segmented" />
      </div>

      <h1 className="text-3xl font-semibold">{t.auth.signupTitle}</h1>
      <p className="muted mt-2" style={{ fontFamily: "var(--font-mono)" }}>
        {t.auth.signupSubtitle}
      </p>

      <form onSubmit={onSubmit} className="card mt-6 space-y-4">
        <div>
          <label className="label" htmlFor="name">
            {t.auth.name}
          </label>
          <input className="input" id="name" name="name" required />
        </div>
        <div>
          <label className="label" htmlFor="restaurantName">
            {t.auth.restaurantName}
          </label>
          <input className="input" id="restaurantName" name="restaurantName" required />
        </div>
        <div>
          <label className="label" htmlFor="email">
            {t.auth.email}
          </label>
          <input className="input" id="email" name="email" type="email" required />
        </div>
        <div>
          <label className="label" htmlFor="password">
            {t.auth.password}
          </label>
          <input className="input" id="password" name="password" type="password" minLength={6} required />
        </div>
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        <button className="btn w-full" disabled={loading}>
          {loading ? t.common.loading : t.auth.signupButton}
        </button>
      </form>
      <p className="muted mt-4 text-sm" style={{ fontFamily: "var(--font-mono)" }}>
        <Link href="/login" className="underline font-semibold hover:text-[var(--brand)]">
          {t.auth.haveAccount}
        </Link>
      </p>
    </main>
  );
}
