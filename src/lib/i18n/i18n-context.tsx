"use client";

import React, { createContext, useContext, useEffect, useState, useTransition } from "react";
import { DEFAULT_LOCALE, getDictionary, getDirection, LOCALES } from "./index";
import { Direction, Locale, LocaleConfig, Translations } from "./types";

interface I18nContextType {
  locale: Locale;
  setLocale: (loc: Locale) => void;
  t: Translations;
  dir: Direction;
  isRtl: boolean;
  config: LocaleConfig;
}

const I18nContext = createContext<I18nContextType | null>(null);

export function I18nProvider({
  children,
  initialLocale = DEFAULT_LOCALE,
}: {
  children: React.ReactNode;
  initialLocale?: Locale;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  const [, startTransition] = useTransition();

  // Initialize from localStorage or cookie on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("estem_locale") as Locale | null;
      if (stored && (stored === "fr" || stored === "en" || stored === "ar")) {
        setLocaleState(stored);
      }
    } catch {
      // Storage access error or SSR
    }
  }, []);

  const setLocale = (newLocale: Locale) => {
    startTransition(() => {
      setLocaleState(newLocale);
      try {
        localStorage.setItem("estem_locale", newLocale);
        document.cookie = `NEXT_LOCALE=${newLocale};path=/;max-age=31536000;SameSite=Lax`;
      } catch {
        // Fallback
      }
    });
  };

  const dir = getDirection(locale);
  const isRtl = dir === "rtl";
  const t = getDictionary(locale);
  const config = LOCALES[locale];

  // Update html attributes whenever locale changes
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = locale;
      document.documentElement.dir = dir;
      if (isRtl) {
        document.documentElement.classList.add("rtl");
      } else {
        document.documentElement.classList.remove("rtl");
      }
    }
  }, [locale, dir, isRtl]);

  return (
    <I18nContext.Provider
      value={{
        locale,
        setLocale,
        t,
        dir,
        isRtl,
        config,
      }}
    >
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    const fallbackLocale = DEFAULT_LOCALE;
    return {
      locale: fallbackLocale,
      setLocale: () => {},
      t: getDictionary(fallbackLocale),
      dir: getDirection(fallbackLocale),
      isRtl: false,
      config: LOCALES[fallbackLocale],
    };
  }
  return ctx;
}
