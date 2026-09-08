"use client";

import { FormEvent, useState } from "react";

type EditCategoryModalProps = {
  orgId: string;
  category: { id: string; name: string };
  onClose: () => void;
  onSuccess: () => Promise<void>;
};

export function EditCategoryModal({
  orgId,
  category,
  onClose,
  onSuccess,
}: EditCategoryModalProps) {
  const [name, setName] = useState(category.name);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Le nom de la catégorie ne peut pas être vide.");
      return;
    }
    if (trimmed === category.name) {
      onClose();
      return;
    }

    setSaving(true);
    setError("");

    try {
      const res = await fetch(`/api/orgs/${orgId}/categories/${category.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Impossible de modifier la catégorie");
      }

      await onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de modification");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
      <div className="card relative w-full max-w-md space-y-4 shadow-2xl border border-[var(--line)] bg-[var(--card)] p-6 rounded-2xl">
        <div className="flex items-center justify-between border-b border-[var(--line)] pb-3">
          <div>
            <h2 className="text-xl font-bold">Modifier la catégorie</h2>
            <p className="muted text-xs">Nom de la catégorie affichée sur le menu</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-lg hover:bg-black/10 dark:hover:bg-white/10"
          >
            ✕
          </button>
        </div>

        {error ? (
          <div className="rounded-lg bg-red-100 p-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
            {error}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label font-medium">Nom de la catégorie *</label>
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex. Plats principaux"
              required
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--line)]">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={onClose}
              disabled={saving}
            >
              Annuler
            </button>
            <button type="submit" className="btn" disabled={saving || !name.trim()}>
              {saving ? "Enregistrement..." : "Enregistrer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
