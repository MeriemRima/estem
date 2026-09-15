"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/i18n-context";

export function CreateRestaurantForm() {
  const router = useRouter();
  const { t, isRtl, dir } = useI18n();
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || loading) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/orgs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || t.createResto.errorMessage);
        return;
      }
      setName("");
      router.push(`/dashboard/${data.id}`);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} dir={dir} className={`card space-y-4 ${isRtl ? "rtl text-right" : ""}`}>
      <h2 className="text-xl font-semibold">{t.createResto.title}</h2>
      <p className="muted text-sm" style={{ fontFamily: "var(--font-mono)" }}>
        {t.createResto.subtitle}
      </p>
      <input
        className="input"
        placeholder={t.createResto.namePlaceholder}
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        minLength={2}
      />
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <button className="btn w-full sm:w-auto" disabled={loading || name.trim().length < 2}>
        {loading ? t.createResto.submitting : t.createResto.submitButton}
      </button>
    </form>
  );
}

