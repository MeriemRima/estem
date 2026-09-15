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
import { useI18n } from "@/lib/i18n/i18n-context";

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
  const { t, isRtl, dir } = useI18n();
  const [branding, setBranding] = useState<Branding>(normalizeBranding(initial));
  const [name, setName] = useState(orgName);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<"logo" | "cover" | null>(null);

  function applyTemplate(id: BrandTemplate) {
    const tmpl = TEMPLATES.find((x) => x.id === id);
    if (!tmpl) return;
    setBranding((b) => ({
      ...b,
      template: id,
      primaryColor: tmpl.preview.primary,
      secondaryColor: tmpl.preview.secondary,
      backgroundColor: tmpl.preview.background,
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
        setError(data.error || t.settings.saveError);
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
        setError(data.error || t.settings.saveError);
        return;
      }
      const next = normalizeBranding(data);
      setBranding(next);
      setOk(t.settings.saveSuccess);
      onSaved?.({ ...next, name: data.name });
    } finally {
      setSaving(false);
    }
  }

  const displayName = branding.brandName.trim() || name;

  return (
    <div dir={dir} className={`grid gap-6 lg:grid-cols-[1.1fr_0.9fr] ${isRtl ? "rtl" : ""}`}>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="card" style={{ borderColor: "var(--brand)" }}>
          <h2 className="text-xl font-semibold">{t.settings.title}</h2>
          <p className="muted mt-1 text-sm" style={{ fontFamily: "var(--font-mono)" }}>
            {t.settings.subtitle}
          </p>
        </div>

        <section className="card space-y-3">
          <h2 className="text-xl font-semibold">{t.settings.brandIdentity}</h2>
          <div>
            <label className="label">{t.auth.restaurantName}</label>
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
            <label className="label">{t.settings.brandName}</label>
            <input
              className="input"
              placeholder={t.settings.brandNameHelp}
              value={branding.brandName}
              onChange={(e) => setBranding((b) => ({ ...b, brandName: e.target.value }))}
              disabled={!canEdit}
            />
          </div>
          <div>
            <label className="label">{t.settings.logoUrl}</label>
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
                  —
                </div>
              )}
              {canEdit ? (
                <div className="flex flex-wrap gap-2">
                  <label className="btn btn-ghost cursor-pointer">
                    {uploading === "logo" ? t.common.loading : t.dishes.image}
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
                      {t.common.delete}
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </section>

        <section className="card space-y-3">
          <h2 className="text-xl font-semibold">{t.settings.menuCoverUrl}</h2>
          <p className="muted text-sm">{t.settings.menuCoverUrlHelp}</p>
          {branding.menuCoverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={branding.menuCoverUrl}
              alt="Couverture menu"
              className="h-36 w-full rounded-xl object-cover"
            />
          ) : (
            <div className="flex h-28 items-center justify-center rounded-xl bg-white/50 muted text-sm">
              —
            </div>
          )}
          {canEdit ? (
            <div className="flex flex-wrap gap-2">
              <label className="btn btn-ghost cursor-pointer">
                {uploading === "cover" ? t.common.loading : t.dishes.image}
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
                  {t.common.delete}
                </button>
              ) : null}
            </div>
          ) : null}
        </section>

        <section className="card space-y-3">
          <h2 className="text-xl font-semibold">{t.settings.fontFamily}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {TEXT_FONTS.map((f) => {
              const selected = branding.textFont === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  disabled={!canEdit}
                  onClick={() => setBranding((b) => ({ ...b, textFont: f.id as TextFont }))}
                  className="rounded-2xl border p-4 text-left rtl:text-right transition"
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
          <h2 className="text-xl font-semibold">{t.settings.displayFormat}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {MENU_FORMATS.map((f) => {
              const selected = branding.menuFormat === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  disabled={!canEdit}
                  onClick={() => setBranding((b) => ({ ...b, menuFormat: f.id as MenuFormat }))}
                  className="rounded-2xl border p-4 text-left rtl:text-right transition"
                  style={{
                    borderColor: selected ? "var(--brand)" : "var(--line)",
                    boxShadow: selected ? "0 0 0 2px color-mix(in srgb, var(--brand) 25%, transparent)" : undefined,
                    background: selected ? "color-mix(in srgb, var(--brand) 8%, white)" : "white",
                  }}
                >
                  <div className="text-lg font-semibold">
                    {f.id === "book" ? t.settings.formatBook : t.settings.formatStandard}
                  </div>
                  <p className="mt-1 text-sm opacity-70">
                    {f.id === "book" ? t.settings.formatBookHelp : t.settings.formatStandardHelp}
                  </p>
                </button>
              );
            })}
          </div>
        </section>

        <section className="card space-y-3">
          <h2 className="text-xl font-semibold">{t.settings.themeTemplate}</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {TEMPLATES.map((tmpl) => {
              const selected = branding.template === tmpl.id;
              return (
                <button
                  key={tmpl.id}
                  type="button"
                  disabled={!canEdit}
                  onClick={() => applyTemplate(tmpl.id)}
                  className="rounded-2xl border p-3 text-left rtl:text-right transition"
                  style={{
                    borderColor: selected ? tmpl.preview.primary : "var(--line)",
                    boxShadow: selected ? `0 0 0 2px ${tmpl.preview.primary}33` : undefined,
                    background: tmpl.preview.background,
                  }}
                >
                  <div className="mb-2 flex gap-1">
                    <span className="h-4 w-4 rounded-full" style={{ background: tmpl.preview.primary }} />
                    <span className="h-4 w-4 rounded-full" style={{ background: tmpl.preview.secondary }} />
                  </div>
                  <div className="font-semibold" style={{ color: tmpl.preview.secondary }}>
                    {tmpl.id === "modern" ? t.settings.templateModern : tmpl.id === "warm" ? t.settings.templateWarm : t.settings.templateClassic}
                  </div>
                  <p className="mt-1 text-xs opacity-70" style={{ color: tmpl.preview.secondary }}>
                    {tmpl.description}
                  </p>
                </button>
              );
            })}
          </div>
        </section>

        <section className="card space-y-3">
          <h2 className="text-xl font-semibold">{t.settings.colors}</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {(
              [
                ["primaryColor", t.settings.primaryColor],
                ["secondaryColor", t.settings.secondaryColor],
                ["backgroundColor", t.settings.backgroundColor],
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
            {saving ? t.common.saving : t.settings.saveSettings}
          </button>
        ) : null}
      </form>

      <aside className="space-y-4">
        <div className="card h-fit space-y-4 overflow-hidden !p-0" style={brandingStyle(branding)}>
          <div className="p-4">
            <p className="text-xs uppercase tracking-[0.15em] opacity-60">{t.settings.preview}</p>
            <div className="mt-3 flex items-center gap-3">
              {branding.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={branding.logoUrl} alt="" className="h-12 w-12 rounded-xl object-cover" />
              ) : null}
              <div className="text-2xl font-semibold">{displayName}</div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full px-3 py-1.5 text-xs font-semibold text-white" style={{ background: branding.primaryColor }}>
                {t.customerMenu.addToCart}
              </span>
              <span className="rounded-full border px-3 py-1.5 text-xs" style={{ borderColor: branding.primaryColor }}>
                {resolveTextFont(branding.textFont).label}
              </span>
            </div>
          </div>
          {branding.menuCoverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={branding.menuCoverUrl} alt="" className="h-28 w-full object-cover" />
          ) : null}
          <div className="space-y-2 p-4 pt-0">
            <div className="rounded-xl border bg-white/80 p-3 text-sm" style={{ borderColor: `${branding.primaryColor}44` }}>
              {t.nav.menu} · 450 {t.common.currency}
            </div>
            <button
              type="button"
              className="w-full rounded-full px-4 py-3 font-semibold text-white"
              style={{ background: branding.primaryColor }}
            >
              {t.customerMenu.confirmOrder}
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}
