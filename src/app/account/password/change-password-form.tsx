"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { useI18n } from "@/lib/i18n/i18n-context";
import { LanguageSwitcher } from "@/components/language-switcher";

export default function ChangePasswordForm() {
  const router = useRouter();
  const { t, isRtl, dir } = useI18n();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(e.currentTarget);
    const newPassword = String(form.get("newPassword") || "");
    const confirm = String(form.get("confirmPassword") || "");
    if (newPassword !== confirm) {
      setError(
        isRtl
          ? "كلمات المرور غير متطابقة"
          : t.common.language === "en"
          ? "Passwords do not match"
          : "Les mots de passe ne correspondent pas"
      );
      setLoading(false);
      return;
    }
    const res = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newPassword }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || t.common.error);
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

      <h1 className="text-3xl font-semibold">{t.auth.changePasswordTitle}</h1>
      <p className="muted mt-2 text-sm" style={{ fontFamily: "var(--font-mono)" }}>
        {t.auth.changePasswordSubtitle}
      </p>

      <form onSubmit={onSubmit} className="card mt-6 space-y-4">
        <div>
          <label className="label" htmlFor="newPassword">
            {t.auth.newPassword}
          </label>
          <input
            className="input"
            id="newPassword"
            name="newPassword"
            type="password"
            minLength={6}
            required
            autoFocus
          />
        </div>
        <div>
          <label className="label" htmlFor="confirmPassword">
            {t.auth.confirmPassword}
          </label>
          <input
            className="input"
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            minLength={6}
            required
          />
        </div>
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        <button className="btn w-full" disabled={loading}>
          {loading ? t.common.loading : t.auth.changePasswordButton}
        </button>
      </form>
    </main>
  );
}
