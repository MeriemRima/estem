"use client";

import { useMemo, useState } from "react";
import { formatMoney } from "@/lib/utils";
import type { Branding } from "@/lib/branding";
import { useI18n } from "@/lib/i18n/i18n-context";

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

type Page =
  | { kind: "cover" }
  | { kind: "category"; category: Category; pageIndex: number; totalInCat: number; items: MenuItem[] };

const ITEMS_PER_PAGE = 5;

function buildPages(categories: Category[]): Page[] {
  const pages: Page[] = [{ kind: "cover" }];
  for (const category of categories) {
    if (category.items.length === 0) {
      pages.push({
        kind: "category",
        category,
        pageIndex: 1,
        totalInCat: 1,
        items: [],
      });
      continue;
    }
    const chunks: MenuItem[][] = [];
    for (let i = 0; i < category.items.length; i += ITEMS_PER_PAGE) {
      chunks.push(category.items.slice(i, i + ITEMS_PER_PAGE));
    }
    chunks.forEach((items, idx) => {
      pages.push({
        kind: "category",
        category,
        pageIndex: idx + 1,
        totalInCat: chunks.length,
        items,
      });
    });
  }
  return pages;
}

export function MenuBook({
  title,
  tableName,
  categories,
  branding,
  onAddItem,
}: {
  title: string;
  tableName: string;
  categories: Category[];
  branding: Branding;
  onAddItem: (item: MenuItem) => void;
}) {
  const { t, isRtl, dir } = useI18n();
  const pages = useMemo(() => buildPages(categories), [categories]);
  const [page, setPage] = useState(0);
  const [turning, setTurning] = useState<"next" | "prev" | null>(null);
  const current = pages[page] ?? pages[0];

  function go(delta: number) {
    const next = page + delta;
    if (next < 0 || next >= pages.length || turning) return;
    setTurning(delta > 0 ? "next" : "prev");
    window.setTimeout(() => {
      setPage(next);
      setTurning(null);
    }, 260);
  }

  return (
    <div dir={dir} className={`mx-auto flex min-h-[70vh] w-full max-w-lg flex-col justify-center ${isRtl ? "rtl" : ""}`}>
      <div className="relative w-full" style={{ perspective: "1600px" }}>
        {/* Reliure */}
        <div
          className={`pointer-events-none absolute bottom-2 top-2 z-10 w-1.5 rounded-full ${
            isRtl ? "right-0" : "left-0"
          }`}
          style={{
            background: `linear-gradient(180deg, ${branding.primaryColor}99, ${branding.secondaryColor}88)`,
            opacity: 0.55,
          }}
        />

        <div
          className={`relative flex min-h-[min(72vh,640px)] flex-col overflow-hidden transition-transform duration-300 ease-out ${
            isRtl ? "mr-2 origin-right" : "ml-2 origin-left"
          }`}
          style={{
            background: "linear-gradient(165deg, #fffefb 0%, #faf3e8 50%, #f3e9da 100%)",
            color: branding.secondaryColor,
            borderRadius: isRtl ? "14px 2px 2px 14px" : "2px 14px 14px 2px",
            border: `1px solid ${branding.primaryColor}28`,
            boxShadow: `4px 8px 24px ${branding.primaryColor}18, inset 6px 0 12px rgba(80,50,20,0.04)`,
            transform:
              turning === "next"
                ? isRtl
                  ? "rotateY(10deg)"
                  : "rotateY(-10deg)"
                : turning === "prev"
                  ? isRtl
                    ? "rotateY(-8deg)"
                    : "rotateY(8deg)"
                  : "rotateY(0deg)",
            transformStyle: "preserve-3d",
          }}
        >
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.08]"
            style={{
              backgroundImage:
                "repeating-linear-gradient(0deg, transparent, transparent 28px, rgba(90,60,30,0.18) 29px)",
            }}
          />
          <div
            className={`pointer-events-none absolute inset-y-0 w-6 ${isRtl ? "right-0" : "left-0"}`}
            style={{
              background: isRtl
                ? "linear-gradient(270deg, rgba(60,35,15,0.06), transparent)"
                : "linear-gradient(90deg, rgba(60,35,15,0.06), transparent)",
            }}
          />

          <div className="relative flex flex-1 flex-col px-5 py-5 sm:px-6">
            {current.kind === "cover" ? (
              <div className="flex flex-1 flex-col items-center justify-center px-2 text-center">
                {branding.menuCoverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={branding.menuCoverUrl}
                    alt=""
                    className="mb-5 h-44 w-full max-w-xs rounded-xl object-cover shadow-sm"
                  />
                ) : branding.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={branding.logoUrl}
                    alt=""
                    className="mb-5 h-24 w-24 rounded-full object-cover shadow-sm"
                  />
                ) : null}
                <p className="text-xs uppercase tracking-[0.35em] opacity-45">Menu</p>
                <h1
                  className="mt-2 text-4xl font-semibold"
                  style={{ fontFamily: "var(--font-display), Georgia, serif" }}
                >
                  {title}
                </h1>
                <div
                  className="my-4 h-px w-20"
                  style={{ background: branding.primaryColor }}
                />
                <p className="text-sm opacity-55">{tableName}</p>
                <p className="mt-10 text-xs uppercase tracking-widest opacity-35">
                  {isRtl ? "← اقلب الصفحة" : "Tourne la page →"}
                </p>
              </div>
            ) : (
              <>
                <div
                  className="mb-4 border-b pb-3"
                  style={{ borderColor: `${branding.primaryColor}28` }}
                >
                  <p className="text-[10px] uppercase tracking-[0.25em] opacity-40">
                    {title}
                  </p>
                  <h2
                    className="text-3xl font-semibold"
                    style={{ color: branding.primaryColor }}
                  >
                    {current.category.name}
                  </h2>
                  {current.totalInCat > 1 ? (
                    <p className="text-xs opacity-45">
                      {t.customerMenu.page} {current.pageIndex}/{current.totalInCat}
                    </p>
                  ) : null}
                </div>

                <div className="flex-1 space-y-2.5">
                  {current.items.length === 0 ? (
                    <p className="text-sm opacity-50">{t.customerMenu.emptyCategory}</p>
                  ) : (
                    current.items.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => onAddItem(item)}
                        className="flex w-full items-start gap-3 rounded-xl bg-white/70 p-2.5 text-left transition active:scale-[0.99]"
                        style={{ border: `1px solid ${branding.primaryColor}14` }}
                      >
                        {item.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.imageUrl}
                            alt=""
                            className="h-14 w-14 shrink-0 rounded-lg object-cover"
                          />
                        ) : null}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline justify-between gap-2">
                            <span className="font-semibold leading-snug">{item.name}</span>
                            <span
                              className="shrink-0 text-sm font-semibold"
                              style={{ color: branding.primaryColor }}
                            >
                              {formatMoney(item.priceCents)}
                            </span>
                          </div>
                          {item.description ? (
                            <p className="mt-0.5 text-xs opacity-55">{item.description}</p>
                          ) : null}
                          <p className="mt-1 text-[10px] uppercase tracking-wide opacity-35">
                            {t.customerMenu.addToCart}
                          </p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </>
            )}

            <div className="mt-auto flex items-center justify-between pt-4 text-xs opacity-40">
              <span>
                {page + 1} / {pages.length}
              </span>
              <span style={{ fontFamily: "var(--font-mono)" }}>{title}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 flex w-full items-center justify-between gap-3">
        <button
          type="button"
          className="rounded-full border bg-white/70 px-5 py-2.5 text-sm font-semibold disabled:opacity-35"
          style={{ borderColor: `${branding.primaryColor}40` }}
          disabled={page === 0 || !!turning}
          onClick={() => go(-1)}
        >
          {isRtl ? `${t.customerMenu.prevPage} →` : `← ${t.customerMenu.prevPage}`}
        </button>
        <button
          type="button"
          className="rounded-full px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-35"
          style={{ background: branding.primaryColor }}
          disabled={page >= pages.length - 1 || !!turning}
          onClick={() => go(1)}
        >
          {isRtl ? `← ${t.customerMenu.nextPage}` : `${t.customerMenu.nextPage} →`}
        </button>
      </div>
    </div>
  );
}
