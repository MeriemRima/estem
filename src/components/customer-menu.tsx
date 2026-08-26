"use client";

import { useEffect, useMemo, useState } from "react";
import { formatMoney } from "@/lib/utils";
import { brandingStyle, displayBrandName, normalizeBranding } from "@/lib/branding";
import { MenuBook } from "@/components/menu-book";

type MenuItem = {
  id: string;
  name: string;
  description: string;
  priceCents: number;
  imageUrl?: string;
};

type Category = {
  id: string;
  name: string;
  items: MenuItem[];
};

type CartLine = { menuItemId: string; name: string; priceCents: number; quantity: number };

export function CustomerMenu({
  slug,
  token,
  restaurantName,
  tableName,
  categories,
  branding: brandingProp,
}: {
  slug: string;
  token: string;
  restaurantName: string;
  tableName: string;
  categories: Category[];
  branding?: Parameters<typeof normalizeBranding>[0];
}) {
  const branding = normalizeBranding(brandingProp);
  const title = displayBrandName(restaurantName, branding.brandName);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [cartMinimized, setCartMinimized] = useState(false);

  const total = useMemo(
    () => cart.reduce((sum, line) => sum + line.priceCents * line.quantity, 0),
    [cart],
  );
  const itemCount = useMemo(
    () => cart.reduce((sum, line) => sum + line.quantity, 0),
    [cart],
  );

  const themeStyle = brandingStyle(branding);
  const radius = branding.template === "modern" ? "0.75rem" : "1.25rem";

  function addItem(item: MenuItem) {
    setCartMinimized(false);
    setCart((prev) => {
      const existing = prev.find((l) => l.menuItemId === item.id);
      if (existing) {
        return prev.map((l) =>
          l.menuItemId === item.id ? { ...l, quantity: l.quantity + 1 } : l,
        );
      }
      return [
        ...prev,
        {
          menuItemId: item.id,
          name: item.name,
          priceCents: item.priceCents,
          quantity: 1,
        },
      ];
    });
  }

  function changeQty(id: string, delta: number) {
    setCart((prev) => {
      const next = prev
        .map((l) => (l.menuItemId === id ? { ...l, quantity: l.quantity + delta } : l))
        .filter((l) => l.quantity > 0);
      if (next.length === 0) setConfirmOpen(false);
      return next;
    });
  }

  async function submitConfirmed() {
    if (cart.length === 0) return;
    setStatus("sending");
    setError("");
    const res = await fetch(`/api/public/${slug}/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        note,
        items: cart.map((l) => ({ menuItemId: l.menuItemId, quantity: l.quantity })),
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Erreur");
      setStatus("error");
      setConfirmOpen(false);
      return;
    }
    setCart([]);
    setNote("");
    setConfirmOpen(false);
    setStatus("done");
  }

  useEffect(() => {
    if (status !== "done") return;
    const t = setTimeout(() => setStatus("idle"), 3500);
    return () => clearTimeout(t);
  }, [status]);

  // Espace bas selon panier ouvert (détail auto) ou réduit
  const bottomPad =
    cart.length === 0 ? "pb-10" : cartMinimized ? "pb-28" : "pb-[min(52vh,28rem)]";

  return (
    <main
      className={`mx-auto min-h-screen w-full max-w-lg px-4 pt-0 ${bottomPad}`}
      style={themeStyle}
    >
      {branding.menuFormat === "book" ? (
        <div className="py-2">
          <MenuBook
            title={title}
            tableName={tableName}
            categories={categories}
            branding={branding}
            onAddItem={addItem}
          />
        </div>
      ) : (
        <>
          {branding.menuCoverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={branding.menuCoverUrl}
              alt=""
              className="-mx-4 mb-4 h-40 w-[calc(100%+2rem)] object-cover sm:mx-0 sm:w-full sm:rounded-b-2xl"
            />
          ) : (
            <div className="h-4" />
          )}
          <header className="mb-6">
            <div className="mb-3 flex items-center gap-3">
              {branding.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={branding.logoUrl}
                  alt={title}
                  className="h-14 w-14 object-cover"
                  style={{ borderRadius: radius }}
                />
              ) : null}
              <div>
                <p className="text-sm uppercase tracking-[0.18em] opacity-60">{tableName}</p>
                <h1 className="text-3xl font-semibold">{title}</h1>
              </div>
            </div>
            <p className="text-sm opacity-70" style={{ fontFamily: "var(--font-mono)" }}>
              Commande à table via QR
            </p>
          </header>

          {error ? (
            <div
              className="mb-4 border border-red-300 bg-white/90 p-4 text-red-700"
              style={{ borderRadius: radius }}
            >
              {error}
            </div>
          ) : null}

          <div className="space-y-6">
            {categories.map((cat) => (
              <section key={cat.id}>
                <h2 className="mb-3 text-2xl font-semibold">{cat.name}</h2>
                <div className="space-y-3">
                  {cat.items.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => addItem(item)}
                      className="w-full border bg-white/90 p-4 text-left shadow-sm transition active:scale-[0.99]"
                      style={{
                        borderRadius: radius,
                        borderColor: `${branding.primaryColor}28`,
                      }}
                    >
                      <div className="flex items-start gap-3">
                        {item.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="h-16 w-16 shrink-0 object-cover"
                            style={{ borderRadius: radius }}
                          />
                        ) : null}
                        <div className="flex min-w-0 flex-1 items-start justify-between gap-3">
                          <div>
                            <div className="text-lg font-semibold">{item.name}</div>
                            {item.description ? (
                              <p
                                className="mt-1 text-sm opacity-70"
                                style={{ fontFamily: "var(--font-mono)" }}
                              >
                                {item.description}
                              </p>
                            ) : null}
                          </div>
                          <div
                            className="whitespace-nowrap font-semibold"
                            style={{ color: branding.primaryColor }}
                          >
                            {formatMoney(item.priceCents)}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </>
      )}

      {branding.menuFormat === "book" && error ? (
        <div
          className="mt-4 border border-red-300 bg-white/90 p-4 text-red-700"
          style={{ borderRadius: radius }}
        >
          {error}
        </div>
      ) : null}

      {/* Panier bas : détail auto dès qu’on ajoute un plat */}
      {cart.length > 0 ? (
        <div
          className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-3"
          style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom, 0px))" }}
        >
          <div
            className="pointer-events-auto mx-auto mb-1 w-full max-w-lg overflow-hidden border shadow-xl"
            style={{
              borderRadius: "1.35rem",
              borderColor: `${branding.primaryColor}30`,
              background: "rgba(255,253,248,0.98)",
              boxShadow: `0 -6px 28px ${branding.primaryColor}22`,
            }}
          >
            <div className="flex items-center justify-between gap-2 px-3 pt-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                  style={{ background: branding.primaryColor }}
                >
                  {itemCount}
                </span>
                <div className="min-w-0">
                  <div className="text-sm font-semibold">Ma commande</div>
                  <div className="truncate text-xs opacity-55" style={{ fontFamily: "var(--font-mono)" }}>
                    {itemCount} article{itemCount > 1 ? "s" : ""} · {formatMoney(total)}
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="rounded-full border px-3 py-1.5 text-xs font-semibold"
                style={{ borderColor: `${branding.primaryColor}40` }}
                onClick={() => setCartMinimized((v) => !v)}
              >
                {cartMinimized ? "Voir" : "Réduire"}
              </button>
            </div>

            {!cartMinimized ? (
              <div className="px-3 pb-3 pt-2">
                <ul className="max-h-[28vh] space-y-1.5 overflow-auto">
                  {cart.map((line) => (
                    <li
                      key={line.menuItemId}
                      className="flex items-center justify-between gap-2 rounded-xl bg-white px-3 py-2 text-sm"
                      style={{ border: `1px solid ${branding.primaryColor}16` }}
                    >
                      <span className="min-w-0 truncate">
                        <strong>{line.quantity}×</strong> {line.name}
                      </span>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="font-semibold" style={{ color: branding.primaryColor }}>
                          {formatMoney(line.priceCents * line.quantity)}
                        </span>
                        <button
                          type="button"
                          className="flex h-7 w-7 items-center justify-center rounded-full border text-sm"
                          style={{ borderColor: `${branding.primaryColor}40` }}
                          onClick={() => changeQty(line.menuItemId, -1)}
                          aria-label="Diminuer"
                        >
                          −
                        </button>
                        <button
                          type="button"
                          className="flex h-7 w-7 items-center justify-center rounded-full text-sm text-white"
                          style={{ background: branding.primaryColor }}
                          onClick={() => changeQty(line.menuItemId, 1)}
                          aria-label="Augmenter"
                        >
                          +
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>

                <input
                  className="mt-2 w-full border bg-white px-3 py-2 text-sm"
                  style={{ borderRadius: radius, borderColor: `${branding.primaryColor}28` }}
                  placeholder="Note cuisine (optionnel)"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />

                <div className="mt-2 flex items-center justify-between text-sm font-semibold">
                  <span>Total</span>
                  <span style={{ color: branding.primaryColor }}>{formatMoney(total)}</span>
                </div>

                <button
                  type="button"
                  className="mt-2 w-full rounded-full px-4 py-3 font-semibold text-white"
                  style={{ background: branding.primaryColor }}
                  onClick={() => setConfirmOpen(true)}
                >
                  Commander · {formatMoney(total)}
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 pb-3 pt-2">
                <button
                  type="button"
                  className="flex-1 rounded-full px-4 py-3 text-sm font-semibold text-white"
                  style={{ background: branding.primaryColor }}
                  onClick={() => setConfirmOpen(true)}
                >
                  Commander · {formatMoney(total)}
                </button>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {confirmOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-4 sm:items-center"
          onClick={() => status !== "sending" && setConfirmOpen(false)}
        >
          <div
            className="w-full max-w-md border bg-[#fffdf8] p-5 shadow-2xl"
            style={{ borderRadius: "1.5rem", borderColor: `${branding.primaryColor}33` }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-1 text-xs uppercase tracking-[0.16em] opacity-50">Confirmation</div>
            <h2 className="text-2xl font-semibold">Valider la commande ?</h2>
            <p className="mt-1 text-sm opacity-70" style={{ fontFamily: "var(--font-mono)" }}>
              {tableName} · {title}
            </p>

            <ul className="mt-4 max-h-48 space-y-2 overflow-auto">
              {cart.map((line) => (
                <li
                  key={line.menuItemId}
                  className="flex items-center justify-between gap-2 rounded-xl bg-white px-3 py-2 text-sm"
                  style={{ border: `1px solid ${branding.primaryColor}18` }}
                >
                  <span>
                    <strong>{line.quantity}×</strong> {line.name}
                  </span>
                  <span className="font-semibold" style={{ color: branding.primaryColor }}>
                    {formatMoney(line.priceCents * line.quantity)}
                  </span>
                </li>
              ))}
            </ul>

            {note.trim() ? (
              <p className="mt-3 rounded-xl bg-white/80 px-3 py-2 text-sm opacity-80">
                Note : {note}
              </p>
            ) : null}

            <div
              className="mt-4 flex items-center justify-between border-t pt-3 text-base font-semibold"
              style={{ borderColor: `${branding.primaryColor}22` }}
            >
              <span>Total</span>
              <span style={{ color: branding.primaryColor }}>{formatMoney(total)}</span>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2">
              <button
                type="button"
                className="rounded-full border px-4 py-3 font-semibold"
                style={{ borderColor: `${branding.primaryColor}44` }}
                disabled={status === "sending"}
                onClick={() => {
                  setConfirmOpen(false);
                  setCartMinimized(false);
                }}
              >
                Modifier
              </button>
              <button
                type="button"
                className="rounded-full px-4 py-3 font-semibold text-white"
                style={{ background: branding.primaryColor }}
                disabled={status === "sending"}
                onClick={() => void submitConfirmed()}
              >
                {status === "sending" ? "Envoi..." : "Confirmer"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {status === "done" ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div
            className="w-full max-w-sm border bg-[#fffdf8] p-6 text-center shadow-2xl"
            style={{ borderRadius: "1.5rem", borderColor: "var(--ok)" }}
          >
            <div
              className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full text-2xl text-white"
              style={{ background: "var(--ok)" }}
            >
              ✓
            </div>
            <h2 className="text-2xl font-semibold">Commande envoyée !</h2>
            <p className="mt-2 text-sm opacity-70" style={{ fontFamily: "var(--font-mono)" }}>
              La cuisine a bien reçu ta commande pour {tableName}.
            </p>
            <button type="button" className="btn mt-5 w-full" onClick={() => setStatus("idle")}>
              Continuer
            </button>
          </div>
        </div>
      ) : null}
    </main>
  );
}
