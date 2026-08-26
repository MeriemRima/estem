"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export default function LoginPage() {
  const router = useRouter();
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
      <h1 className="text-3xl font-semibold">Connexion</h1>
      <form onSubmit={onSubmit} className="card mt-8 space-y-4">
        <div>
          <label className="label" htmlFor="email">
            Email
          </label>
          <input className="input" id="email" name="email" type="email" required />
        </div>
        <div>
          <label className="label" htmlFor="password">
            Mot de passe
          </label>
          <input className="input" id="password" name="password" type="password" required />
        </div>
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        <button className="btn w-full" disabled={loading}>
          {loading ? "..." : "Se connecter"}
        </button>
      </form>
      <p className="muted mt-4 text-sm" style={{ fontFamily: "var(--font-mono)" }}>
        Nouveau ? Demande un accès à l&apos;admin des restaurants.
      </p>
    </main>
  );
}
