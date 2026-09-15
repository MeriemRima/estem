"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { useI18n } from "@/lib/i18n/i18n-context";
import { LanguageSwitcher } from "@/components/language-switcher";

export default function LoginPage() {
  const router = useRouter();
  const { t, isRtl, dir } = useI18n();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: form.get("email"),
        password: form.get("password"),
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || t.auth.invalidCredentials);
      return;
    }
    router.push(data.redirectTo || "/dashboard");
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

      <h1 className="text-3xl font-semibold">{t.auth.loginTitle}</h1>
      <p className="muted mt-1 text-sm">{t.auth.loginSubtitle}</p>

      <form onSubmit={onSubmit} className="card mt-6 space-y-4">
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
          <input className="input" id="password" name="password" type="password" required />
        </div>
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        <button className="btn w-full" disabled={loading}>
          {loading ? t.common.loading : t.auth.loginButton}
        </button>
      </form>
      <p className="muted mt-4 text-sm" style={{ fontFamily: "var(--font-mono)" }}>
        {t.auth.signupSubtitle}
      </p>
    </main>
  );
}
