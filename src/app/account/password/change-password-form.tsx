"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export default function ChangePasswordForm() {
  const router = useRouter();
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
      setError("Les mots de passe ne correspondent pas");
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
      setError(data.error || "Erreur");
      return;
    }
    router.push(data.redirectTo || "/dashboard");
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-10">
      <Link href="/" className="mb-8 text-2xl font-semibold">
        Estem
      </Link>
      <h1 className="text-3xl font-semibold">Nouveau mot de passe</h1>
      <p className="muted mt-2 text-sm" style={{ fontFamily: "var(--font-mono)" }}>
        Choisis un mot de passe personnel pour accéder à ton restaurant. Tu n&apos;as plus
        besoin du provisoire.
      </p>
      <form onSubmit={onSubmit} className="card mt-8 space-y-4">
        <div>
          <label className="label" htmlFor="newPassword">
            Nouveau mot de passe
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
            Confirmer
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
          {loading ? "..." : "Enregistrer et continuer"}
        </button>
      </form>
    </main>
  );
}
