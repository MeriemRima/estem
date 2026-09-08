"use client";

import { FormEvent, useState } from "react";

type Item = {
  id: string;
  name: string;
  description: string;
  priceCents: number;
  imageUrl: string;
  available: boolean;
  categoryId: string;
};

type Category = {
  id: string;
  name: string;
};

type EditDishModalProps = {
  orgId: string;
  item: Item;
  categories: Category[];
  onClose: () => void;
  onSuccess: () => Promise<void>;
};

export function EditDishModal({
  orgId,
  item,
  categories,
  onClose,
  onSuccess,
}: EditDishModalProps) {
  const [name, setName] = useState(item.name);
  const [description, setDescription] = useState(item.description ?? "");
  const [price, setPrice] = useState(String(item.priceCents / 100));
  const [categoryId, setCategoryId] = useState(item.categoryId);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>(item.imageUrl || "");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function handleFileChange(file: File | null) {
    setImageFile(file);
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    } else {
      setPreviewUrl(item.imageUrl || "");
    }
  }

  async function uploadImage(): Promise<string> {
    if (!imageFile) return previewUrl;
    const fd = new FormData();
    fd.append("file", imageFile);
    const res = await fetch(`/api/orgs/${orgId}/upload`, {
      method: "POST",
      body: fd,
    });
    if (!res.ok) {
      throw new Error("Échec upload de l'image");
    }
    const data = await res.json();
    return data.url;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (saving) return;

    const numPrice = Number(price);
    if (!name.trim() || !Number.isFinite(numPrice) || numPrice <= 0 || !categoryId) {
      setError("Veuillez remplir correctement tous les champs requis.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      let finalImageUrl = previewUrl;
      if (imageFile) {
        finalImageUrl = await uploadImage();
      }

      const res = await fetch(`/api/orgs/${orgId}/items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          priceCents: Math.round(numPrice * 100),
          categoryId,
          imageUrl: finalImageUrl,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Impossible de modifier le plat");
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm animate-fade-in">
      <div className="card relative max-h-[90vh] w-full max-w-md space-y-3 shadow-2xl border border-[var(--line)] bg-[var(--card)] p-5 rounded-2xl">
        <div className="flex items-center justify-between border-b border-[var(--line)] pb-2">
          <div>
            <h2 className="text-lg font-bold">Modifier le plat</h2>
            <p className="muted text-xs">Informations du plat</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full text-base hover:bg-black/10 dark:hover:bg-white/10"
          >
            ✕
          </button>
        </div>

        {error ? (
          <div className="rounded-lg bg-red-100 p-2 text-xs text-red-800 dark:bg-red-950 dark:text-red-200">
            {error}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-3 text-sm">
          <div>
            <label className="label text-xs font-medium">Nom du plat *</label>
            <input
              className="input text-sm py-2"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex. Tajine de Poulet"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label text-xs font-medium">Catégorie *</label>
              <select
                className="input text-sm py-2"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                required
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label text-xs font-medium">Prix (DH) *</label>
              <input
                className="input text-sm py-2"
                type="number"
                step="0.01"
                min="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="45.00"
                required
              />
            </div>
          </div>

          <div>
            <label className="label text-xs font-medium">Description</label>
            <textarea
              className="input text-sm min-h-[55px] py-1.5 resize-y"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ingrédients, épices, garniture..."
            />
          </div>

          <div>
            <label className="label text-xs font-medium">Photo du plat</label>
            <div className="flex items-center gap-3">
              {previewUrl ? (
                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-[var(--line)] bg-stone-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewUrl}
                    alt="Aperçu"
                    className="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setImageFile(null);
                      setPreviewUrl("");
                    }}
                    title="Supprimer la photo"
                    className="absolute inset-0 flex items-center justify-center bg-black/60 text-xs font-bold text-white opacity-0 hover:opacity-100 transition-opacity"
                  >
                    ✕
                  </button>
                </div>
              ) : null}
              <input
                className="input text-xs py-1"
                type="file"
                accept="image/*"
                onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--line)]">
            <button
              type="button"
              className="btn btn-ghost text-xs px-3 py-1.5"
              onClick={onClose}
              disabled={saving}
            >
              Annuler
            </button>
            <button type="submit" className="btn text-xs px-4 py-1.5" disabled={saving}>
              {saving ? "Enregistrement..." : "Enregistrer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
