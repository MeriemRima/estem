"use client";

import { useMemo, useState } from "react";
import type { Branding } from "@/lib/branding";
import { resolveTextFont } from "@/lib/branding";
import { qrImageUrl } from "@/lib/utils";

type Table = {
  id: string;
  name: string;
  token: string;
};

type Props = {
  tables: Table[];
  branding: Branding;
  slug: string;
  origin: string;
  onClose: () => void;
};

export function QrPrintModal({ tables, branding, slug, origin, onClose }: Props) {
  const [useThemeBackground, setUseThemeBackground] = useState(true);
  const [selectedTableIds, setSelectedTableIds] = useState<string[]>(() =>
    tables.map((t) => t.id),
  );

  const font = resolveTextFont(branding.textFont);
  const displayFont = `var(${font.displayVar}), Georgia, serif`;
  const bodyFont = `var(${font.bodyVar}), system-ui, sans-serif`;

  const filteredTables = useMemo(
    () => tables.filter((t) => selectedTableIds.includes(t.id)),
    [tables, selectedTableIds],
  );

  // Group tables into 4 cards per A4 sheet (2x2 grid)
  const pages = useMemo(() => {
    const chunks: Table[][] = [];
    for (let i = 0; i < filteredTables.length; i += 4) {
      chunks.push(filteredTables.slice(i, i + 4));
    }
    return chunks;
  }, [filteredTables]);

  const toggleTable = (id: string) => {
    setSelectedTableIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const selectAll = () => setSelectedTableIds(tables.map((t) => t.id));
  const deselectAll = () => setSelectedTableIds([]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/75 backdrop-blur-sm">
      {/* Top action bar - Hidden when printing */}
      <header className="no-print flex flex-wrap items-center justify-between gap-4 border-b border-white/15 bg-[#18181b] px-6 py-3.5 text-white shadow-lg">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-600/20 text-orange-400">
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
              />
            </svg>
          </div>
          <div>
            <h2 className="text-base font-semibold leading-snug">
              Imprimer les QR codes (Format A4)
            </h2>
            <p className="text-xs text-zinc-400">
              {filteredTables.length} table{filteredTables.length > 1 ? "s" : ""} sélectionnée{filteredTables.length > 1 ? "s" : ""} · {pages.length} page{pages.length > 1 ? "s" : ""} A4 (4 par page)
            </p>
          </div>
        </div>

        {/* Print controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Background Toggle */}
          <div className="flex items-center rounded-xl bg-zinc-800 p-1 text-xs font-medium text-zinc-300">
            <button
              type="button"
              onClick={() => setUseThemeBackground(true)}
              className={`rounded-lg px-3 py-1.5 transition ${
                useThemeBackground
                  ? "bg-zinc-700 text-white shadow"
                  : "hover:text-white"
              }`}
            >
              Fond restaurant
            </button>
            <button
              type="button"
              onClick={() => setUseThemeBackground(false)}
              className={`rounded-lg px-3 py-1.5 transition ${
                !useThemeBackground
                  ? "bg-zinc-700 text-white shadow"
                  : "hover:text-white"
              }`}
            >
              Fond blanc (éco)
            </button>
          </div>

          {/* Print Button */}
          <button
            type="button"
            onClick={handlePrint}
            disabled={filteredTables.length === 0}
            className="flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:bg-orange-500 disabled:opacity-50"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
              />
            </svg>
            Imprimer / Enregistrer en PDF
          </button>

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-800 text-zinc-400 transition hover:bg-zinc-700 hover:text-white"
          >
            ✕
          </button>
        </div>
      </header>

      {/* Main Content: Sidebar selector + Sheets Preview */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Drawer / Table checklist - Hidden when printing */}
        <aside className="no-print hidden w-72 flex-col border-r border-white/10 bg-[#1f1f23] p-4 text-white sm:flex">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Tables à imprimer
            </span>
            <div className="flex gap-2 text-xs">
              <button
                type="button"
                onClick={selectAll}
                className="text-orange-400 hover:underline"
              >
                Toutes
              </button>
              <span className="text-zinc-600">|</span>
              <button
                type="button"
                onClick={deselectAll}
                className="text-zinc-400 hover:underline"
              >
                Aucune
              </button>
            </div>
          </div>

          <div className="flex-1 space-y-1.5 overflow-y-auto pr-1">
            {tables.map((table) => {
              const checked = selectedTableIds.includes(table.id);
              return (
                <label
                  key={table.id}
                  className={`flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-sm transition ${
                    checked
                      ? "bg-zinc-800/80 text-white"
                      : "text-zinc-400 hover:bg-zinc-800/40"
                  }`}
                >
                  <span className="font-medium">{table.name}</span>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleTable(table.id)}
                    className="h-4 w-4 rounded accent-orange-600"
                  />
                </label>
              );
            })}
          </div>

          <div className="mt-4 border-t border-white/10 pt-3 text-[11px] leading-relaxed text-zinc-400">
            <p>
              💡 Astuce : Dans la boîte d&apos;impression de votre navigateur, choisissez
              <strong className="text-zinc-200"> « Enregistrer au format PDF » </strong>
              pour sauvegarder le document A4.
            </p>
          </div>
        </aside>

        {/* Printable & Preview area */}
        <main className="flex-1 overflow-y-auto bg-zinc-900/60 p-4 sm:p-8">
          {filteredTables.length === 0 ? (
            <div className="flex h-64 items-center justify-center text-zinc-400">
              Aucune table sélectionnée pour l&apos;impression.
            </div>
          ) : (
            <div id="qr-print-sheets" className="flex flex-col items-center gap-10">
              {pages.map((pageTables, pageIndex) => (
                <div
                  key={pageIndex}
                  className={`qr-page-sheet relative flex flex-col justify-between shadow-2xl transition-all ${
                    pageIndex < pages.length - 1 ? "mb-6" : ""
                  }`}
                  style={{
                    width: "210mm",
                    height: "296mm",
                    maxHeight: "296mm",
                    padding: "10mm",
                    boxSizing: "border-box",
                    backgroundColor: useThemeBackground
                      ? branding.backgroundColor || "#c4a470"
                      : "#ffffff",
                    color: branding.secondaryColor || "#1c1917",
                  }}
                >
                  {/* Page header indicator for on-screen preview only */}
                  <div className="no-print absolute -top-6 left-0 text-xs font-medium text-zinc-400">
                    Feuille A4 · Page {pageIndex + 1} sur {pages.length}
                  </div>

                  {/* 2x2 Grid for 4 Cards */}
                  <div
                    className="qr-grid-container grid h-full w-full grid-cols-2 grid-rows-2 gap-[8mm]"
                    style={{ height: "100%" }}
                  >
                    {pageTables.map((table) => {
                      const url = `${origin || ""}/o/${slug}/t/${table.token}`;
                      return (
                        <div
                          key={table.id}
                          className="qr-card-item flex h-full flex-col items-center justify-between rounded-[24px] bg-[#FAF7F2] px-4 py-4 text-center shadow-md sm:py-5"
                          style={{
                            border: useThemeBackground
                              ? "none"
                              : "1px dashed rgba(0,0,0,0.18)",
                          }}
                        >
                          {/* Card Top: Table Name in display font */}
                          <div className="w-full pt-0.5">
                            <h3
                              className="text-xl font-bold tracking-tight sm:text-2xl"
                              style={{
                                fontFamily: displayFont,
                                color: branding.secondaryColor || "#1c1917",
                              }}
                            >
                              {table.name}
                            </h3>
                          </div>

                          {/* Center: QR Code with 4 stylish corner brackets */}
                          <div className="relative my-1 flex h-[142px] w-[142px] items-center justify-center p-2">
                            {/* Top-Left Bracket */}
                            <span
                              className="absolute left-0 top-0 h-5 w-5 rounded-tl-lg border-l-[3px] border-t-[3px]"
                              style={{ borderColor: branding.primaryColor || "#1b4332" }}
                            />
                            {/* Top-Right Bracket */}
                            <span
                              className="absolute right-0 top-0 h-5 w-5 rounded-tr-lg border-r-[3px] border-t-[3px]"
                              style={{ borderColor: branding.primaryColor || "#1b4332" }}
                            />
                            {/* Bottom-Left Bracket */}
                            <span
                              className="absolute bottom-0 left-0 h-5 w-5 rounded-bl-lg border-b-[3px] border-l-[3px]"
                              style={{ borderColor: branding.primaryColor || "#1b4332" }}
                            />
                            {/* Bottom-Right Bracket */}
                            <span
                              className="absolute bottom-0 right-0 h-5 w-5 rounded-br-lg border-b-[3px] border-r-[3px]"
                              style={{ borderColor: branding.primaryColor || "#1b4332" }}
                            />

                            {/* Crisp QR Code */}
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={qrImageUrl(url, 450)}
                              alt={`QR ${table.name}`}
                              className="h-[114px] w-[114px] object-contain"
                              width={114}
                              height={114}
                            />
                          </div>

                          {/* Call To Action & Subtitle */}
                          <div className="flex flex-col items-center space-y-1.5 px-2">
                            <div
                              className="text-lg font-semibold italic leading-tight sm:text-xl"
                              style={{
                                fontFamily: displayFont,
                                color: branding.primaryColor || "#1b4332",
                              }}
                            >
                              Gagne du Temps
                            </div>
                            <p
                              className="text-xs font-medium tracking-wide"
                              style={{
                                fontFamily: bodyFont,
                                color: "#57534e",
                              }}
                            >
                              Scan.Menu.Choix.Commande
                            </p>
                          </div>

                          {/* Accent Divider */}
                          <div
                            className="h-[2px] w-12 rounded-full"
                            style={{
                              backgroundColor: branding.primaryColor || "#c5a059",
                            }}
                          />

                          {/* Footer Branding */}
                          <div
                            className="flex flex-col items-center space-y-0.5 pb-1 text-center"
                            style={{ fontFamily: bodyFont }}
                          >
                            <div className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: branding.secondaryColor || "#1c1917" }}>
                              <span
                                style={{
                                  color: branding.primaryColor || "#c5a059",
                                  fontSize: "10px",
                                }}
                              >
                                ◆
                              </span>
                              <span>By eSTEM Morocco</span>
                            </div>
                            <a
                              href="https://estem-morocco.org/"
                              target="_blank"
                              rel="noreferrer"
                              className="text-[11px] text-[#78716c] hover:underline"
                            >
                              estem-morocco.org
                            </a>
                          </div>
                        </div>
                      );
                    })}

                    {/* Fill empty cells if page has fewer than 4 cards to keep 2x2 grid alignment */}
                    {pageTables.length < 4
                      ? Array.from({ length: 4 - pageTables.length }).map((_, idx) => (
                          <div
                            key={`empty-${idx}`}
                            className="h-full rounded-[26px] border border-dashed border-black/10 opacity-30"
                          />
                        ))
                      : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
