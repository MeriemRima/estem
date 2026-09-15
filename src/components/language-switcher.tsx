"use client";

import { useI18n } from "@/lib/i18n/i18n-context";
import { LOCALES } from "@/lib/i18n";
import { Locale } from "@/lib/i18n/types";
import { useState, useRef, useEffect } from "react";

const availableLocales: Locale[] = ["fr", "en", "ar"];

export function LanguageSwitcher({
  variant = "segmented",
  className = "",
}: {
  variant?: "segmented" | "dropdown";
  className?: string;
}) {
  const { locale, setLocale } = useI18n();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  if (variant === "dropdown") {
    const current = LOCALES[locale];
    return (
      <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="inline-flex items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--card)] px-3 py-1.5 text-xs font-semibold shadow-sm transition hover:border-[var(--brand)]"
          aria-expanded={open}
        >
          <span className="rounded bg-[rgba(194,65,12,0.12)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--brand)]">
            {current.badge}
          </span>
          <span>{current.nativeLabel}</span>
          <span className="text-[10px] opacity-60">▼</span>
        </button>

        {open && (
          <div className="absolute right-0 z-50 mt-1.5 min-w-[140px] rounded-xl border border-[var(--line)] bg-[var(--card)] p-1 shadow-lg backdrop-blur-md">
            {availableLocales.map((code) => {
              const cfg = LOCALES[code];
              const isSelected = code === locale;
              return (
                <button
                  key={code}
                  type="button"
                  onClick={() => {
                    setLocale(code);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-xs transition ${
                    isSelected
                      ? "bg-[rgba(194,65,12,0.1)] font-semibold text-[var(--brand)]"
                      : "hover:bg-[rgba(0,0,0,0.05)] text-[var(--ink)]"
                  }`}
                >
                  <span className="rounded bg-black/5 px-1.5 py-0.5 text-[10px] font-bold text-stone-600 dark:bg-white/10 dark:text-stone-300">
                    {cfg.badge}
                  </span>
                  <span className="flex-1">{cfg.nativeLabel}</span>
                  {isSelected && <span className="text-xs text-[var(--brand)]">✓</span>}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // Segmented compact pill (default)
  return (
    <div
      className={`inline-flex items-center rounded-full border border-[var(--line)] bg-[var(--card)] p-0.5 shadow-sm ${className}`}
      role="group"
      aria-label="Language selector"
    >
      {availableLocales.map((code) => {
        const cfg = LOCALES[code];
        const isSelected = code === locale;
        return (
          <button
            key={code}
            type="button"
            onClick={() => setLocale(code)}
            className={`flex items-center rounded-full px-3 py-1 text-xs font-semibold transition ${
              isSelected
                ? "bg-[var(--ink)] text-white shadow-sm"
                : "text-[var(--muted)] hover:text-[var(--ink)]"
            }`}
            title={cfg.label}
          >
            <span>{cfg.badge}</span>
          </button>
        );
      })}
    </div>
  );
}
