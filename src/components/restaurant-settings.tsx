"use client";

import { FormEvent, useState } from "react";
import {
  Branding,
  BrandTemplate,
  MENU_FORMATS,
  MenuFormat,
  TEMPLATES,
  TEXT_FONTS,
  TextFont,
  brandingStyle,
  normalizeBranding,
  resolveTextFont,
} from "@/lib/branding";

type Props = {
  orgId: string;
  orgName: string;
  initial: Branding;
  canEdit: boolean;
  onSaved?: (branding: Branding & { name?: string }) => void;
};

export function RestaurantSettings({
  orgId,
  orgName,
  initial,
  canEdit,
  onSaved,
}: Props) {
  const [branding, setBranding] = useState<Branding>(normalizeBranding(initial));
  const [name, setName] = useState(orgName);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<"logo" | "cover" | null>(null);

  function applyTemplate(id: BrandTemplate) {
    const t = TEMPLATES.find((x) => x.id === id);
    if (!t) return;
    setBranding((b) => ({
      ...b,
      template: id,
      primaryColor: t.preview.primary,
      secondaryColor: t.preview.secondary,
      backgroundColor: t.preview.background,
    }));
  }

  async function uploadImage(file: File, field: "logoUrl" | "menuCoverUrl") {
    setUploading(field === "logoUrl" ? "logo" : "cover");
    setError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/orgs/${orgId}/upload`, { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Upload impossible");
        return;
      }
      setBranding((b) => ({ ...b, [field]: data.url }));
    } finally {
      setUploading(null);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canEdit || saving) return;
    setSaving(true);
    setError("");
    setOk("");
    try {
      const res = await fetch(`/api/orgs/${orgId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          brandName: branding.brandName,
          logoUrl: branding.logoUrl,
          menuCoverUrl: branding.menuCoverUrl,
          menuFormat: branding.menuFormat,
          textFont: branding.textFont,
          primaryColor: branding.primaryColor,
          secondaryColor: branding.secondaryColor,
          backgroundColor: branding.backgroundColor,
          template: branding.template,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Enregistrement impossible");
        return;
      }
      const next = normalizeBranding(data);
      setBranding(next);
      setOk("Thème appliqué à tout le site resto : Admin, Menu, Tables, Commandes et menu QR client.");
      onSaved?.({ ...next, name: data.name });
    } finally {
      setSaving(false);
    }
  }

  const displayName = branding.brandName.trim() || name;

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="card" style={{ borderColor: "var(--brand)" }}>
          <h2 className="text-xl font-semibold">Personnalisation globale</h2>
          <p className="muted mt-1 text-sm" style={{ fontFamily: "var(--font-mono)" }}>
            Logo, couleurs et photo s&apos;appliquent à <strong>toutes</strong> les pages de ce
            restaurant (admin, menu, tables, commandes, QR client).
          </p>
        </div>

        {!canEdit ? (
          <div className="card muted">Lecture seule — Gérant ou Responsable peuvent personnaliser.</div>
        ) : null}

        <section className="card space-y-3">
          <h2 className="text-xl font-semibold">Identité & logo</h2>
          <div>
            <label className="label">Nom du restaurant</label>
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={!canEdit}
              required
              minLength={2}
            />
          </div>
          <div>
            <label className="label">Nom de marque (affiché partout)</label>
            <input
              className="input"
              placeholder={name || "Ex. Little Mama"}
              value={branding.brandName}
              onChange={(e) => setBranding((b) => ({ ...b, brandName: e.target.value }))}
              disabled={!canEdit}
            />
          </div>
          <div>
            <label className="label">Logo (site + menu)</label>
            <div className="flex flex-wrap items-center gap-3">
              {branding.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={branding.logoUrl}
                  alt="Logo"
                  className="h-16 w-16 rounded-xl object-cover border border-[var(--line)]"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-white/60 text-xs muted">
                  Aucun
                </div>
              )}
              {canEdit ? (
                <div className="flex flex-wrap gap-2">
                  <label className="btn btn-ghost cursor-pointer">
                    {uploading === "logo" ? "Upload..." : "Choisir logo"}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={!!uploading}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) void uploadImage(f, "logoUrl");
                      }}
                    />
                  </label>
                  {branding.logoUrl ? (
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => setBranding((b) => ({ ...b, logoUrl: "" }))}
                    >
                      Retirer
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </section>

        <section className="card space-y-3">
          <h2 className="text-xl font-semibold">Photo menu (bannière)</h2>
          <p className="muted text-sm">Affichée en haut du menu client QR.</p>
          {branding.menuCoverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={branding.menuCoverUrl}
              alt="Couverture menu"
              className="h-36 w-full rounded-xl object-cover"
            />
          ) : (
            <div className="flex h-28 items-center justify-center rounded-xl bg-white/50 muted text-sm">
              Aucune photo
            </div>
          )}
          {canEdit ? (
            <div className="flex flex-wrap gap-2">
              <label className="btn btn-ghost cursor-pointer">
                {uploading === "cover" ? "Upload..." : "Choisir une photo"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={!!uploading}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void uploadImage(f, "menuCoverUrl");
                  }}
                />
              </label>
              {branding.menuCoverUrl ? (
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setBranding((b) => ({ ...b, menuCoverUrl: "" }))}
                >
                  Retirer
                </button>
              ) : null}
            </div>
          ) : null}
        </section>

        <section className="card space-y-3">
          <h2 className="text-xl font-semibold">Polices de texte</h2>
          <p className="muted text-sm">
            Appliquées au site resto (espace, menu, tables, commandes) et au menu QR client.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {TEXT_FONTS.map((f) => {
              const selected = branding.textFont === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  disabled={!canEdit}
                  onClick={() => setBranding((b) => ({ ...b, textFont: f.id as TextFont }))}
                  className="rounded-2xl border p-4 text-left transition"
                  style={{
                    borderColor: selected ? "var(--brand)" : "var(--line)",
                    boxShadow: selected
                      ? "0 0 0 2px color-mix(in srgb, var(--brand) 25%, transparent)"
                      : undefined,
                    background: selected ? "color-mix(in srgb, var(--brand) 8%, white)" : "white",
                    fontFamily: `var(${f.displayVar}), Georgia, serif`,
                  }}
                >
                  <div className="text-xl font-semibold tracking-tight">{f.sample}</div>
                  <div className="mt-2 text-sm font-semibold">{f.label}</div>
                  <p
                    className="mt-0.5 text-xs opacity-70"
                    style={{ fontFamily: `var(${f.bodyVar}), system-ui, sans-serif` }}
                  >
                    {f.description}
                  </p>
                </button>
              );
            })}
          </div>
        </section>

        <section className="card space-y-3">
          <h2 className="text-xl font-semibold">Format du menu client</h2>
          <p className="muted text-sm">Choisis comment les clients voient le menu QR.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {MENU_FORMATS.map((f) => {
              const selected = branding.menuFormat === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  disabled={!canEdit}
                  onClick={() => setBranding((b) => ({ ...b, menuFormat: f.id as MenuFormat }))}
                  className="rounded-2xl border p-4 text-left transition"
                  style={{
                    borderColor: selected ? "var(--brand)" : "var(--line)",
                    boxShadow: selected ? "0 0 0 2px color-mix(in srgb, var(--brand) 25%, transparent)" : undefined,
                    background: selected ? "color-mix(in srgb, var(--brand) 8%, white)" : "white",
                  }}
                >
                  <div className="text-lg font-semibold">{f.label}</div>
                  <p className="mt-1 text-sm opacity-70">{f.description}</p>
                  <div
                    className="mt-3 overflow-hidden rounded-lg border text-[10px]"
                    style={{ borderColor: "var(--line)", height: 56 }}
                  >
                    {f.id === "standard" ? (
                      <div className="space-y-1 bg-[var(--bg)] p-2">
                        <div className="h-2 w-1/3 rounded bg-[var(--brand)]/40" />
                        <div className="h-3 rounded bg-white" />
                        <div className="h-3 rounded bg-white" />
                      </div>
                    ) : (
                      <div className="flex h-full items-center justify-center gap-1 bg-[#3d2c1e] p-2">
                        <div className="h-full w-[42%] rounded-sm bg-[#f5e6d3] shadow" />
                        <div className="h-full w-[42%] rounded-sm bg-[#faf0e4] shadow" />
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section className="card space-y-3">
          <h2 className="text-xl font-semibold">Template</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {TEMPLATES.map((t) => {
              const selected = branding.template === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  disabled={!canEdit}
                  onClick={() => applyTemplate(t.id)}
                  className="rounded-2xl border p-3 text-left transition"
                  style={{
                    borderColor: selected ? t.preview.primary : "var(--line)",
                    boxShadow: selected ? `0 0 0 2px ${t.preview.primary}33` : undefined,
                    background: t.preview.background,
                  }}
                >
                  <div className="mb-2 flex gap-1">
                    <span className="h-4 w-4 rounded-full" style={{ background: t.preview.primary }} />
                    <span className="h-4 w-4 rounded-full" style={{ background: t.preview.secondary }} />
                  </div>
                  <div className="font-semibold" style={{ color: t.preview.secondary }}>
                    {t.label}
                  </div>
                  <p className="mt-1 text-xs opacity-70" style={{ color: t.preview.secondary }}>
                    {t.description}
                  </p>
                </button>
              );
            })}
          </div>
        </section>

        <section className="card space-y-3">
          <h2 className="text-xl font-semibold">Couleurs (boutons, fond, texte)</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {(
              [
                ["primaryColor", "Boutons / accent"],
                ["secondaryColor", "Texte"],
                ["backgroundColor", "Fond pages"],
              ] as const
            ).map(([key, label]) => (
              <div key={key}>
                <label className="label">{label}</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={branding[key]}
                    disabled={!canEdit}
                    onChange={(e) => setBranding((b) => ({ ...b, [key]: e.target.value }))}
                    className="h-10 w-12 cursor-pointer rounded border border-[var(--line)] bg-white"
                  />
                  <input
                    className="input font-mono text-sm"
                    value={branding[key]}
                    disabled={!canEdit}
                    onChange={(e) => setBranding((b) => ({ ...b, [key]: e.target.value }))}
                    pattern="^#[0-9A-Fa-f]{6}$"
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        {ok ? <p className="text-sm" style={{ color: "var(--ok)" }}>{ok}</p> : null}

        {canEdit ? (
          <button className="btn" disabled={saving}>
            {saving ? "Enregistrement..." : "Enregistrer — appliquer à tout le site"}
          </button>
        ) : null}
      </form>

      <aside className="space-y-4">
        <div className="card h-fit space-y-4 overflow-hidden !p-0" style={brandingStyle(branding)}>
          <div className="p-4">
            <p className="text-xs uppercase tracking-[0.15em] opacity-60">Aperçu site resto</p>
            <div className="mt-3 flex items-center gap-3">
              {branding.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={branding.logoUrl} alt="" className="h-12 w-12 rounded-xl object-cover" />
              ) : null}
              <div className="text-2xl font-semibold">{displayName}</div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full px-3 py-1.5 text-xs font-semibold text-white" style={{ background: branding.primaryColor }}>
                Bouton
              </span>
              <span className="rounded-full border px-3 py-1.5 text-xs" style={{ borderColor: branding.primaryColor }}>
                {resolveTextFont(branding.textFont).label}
              </span>
              <span className="rounded-full border px-3 py-1.5 text-xs" style={{ borderColor: branding.primaryColor }}>
                {branding.menuFormat === "book" ? "Format livre" : "Format standard"}
              </span>
            </div>
          </div>
          {branding.menuCoverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={branding.menuCoverUrl} alt="" className="h-28 w-full object-cover" />
          ) : null}
          <div className="space-y-2 p-4 pt-0">
            <div className="rounded-xl border bg-white/80 p-3 text-sm" style={{ borderColor: `${branding.primaryColor}44` }}>
              Carte menu · 45,00 DH
            </div>
            <button
              type="button"
              className="w-full rounded-full px-4 py-3 font-semibold text-white"
              style={{ background: branding.primaryColor }}
            >
              Commander
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}
