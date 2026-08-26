"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function CreateRestaurantForm() {
  const router = useRouter();
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
        setError(data.error || "Impossible de créer le restaurant");
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
    <form onSubmit={onSubmit} className="card space-y-4">
      <h2 className="text-xl font-semibold">Créer un restaurant</h2>
      <p className="muted text-sm" style={{ fontFamily: "var(--font-mono)" }}>
        Tu pourras ensuite gérer le menu, les tables QR et la cuisine.
      </p>
      <input
        className="input"
        placeholder="Nom du restaurant"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        minLength={2}
      />
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <button className="btn w-full sm:w-auto" disabled={loading || name.trim().length < 2}>
        {loading ? "Création..." : "Créer mon restaurant"}
      </button>
    </form>
  );
}
