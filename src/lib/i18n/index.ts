import { ar } from "./dictionaries/ar";
import { en } from "./dictionaries/en";
import { fr } from "./dictionaries/fr";
import { Direction, Locale, LocaleConfig, Translations } from "./types";

export * from "./types";

export const LOCALES: Record<Locale, LocaleConfig> = {
  fr: {
    code: "fr",
    label: "Français",
    nativeLabel: "Français",
    badge: "FR",
    dir: "ltr",
  },
  ar: {
    code: "ar",
    label: "Arabe",
    nativeLabel: "العربية",
    badge: "AR",
    dir: "rtl",
  },
  en: {
    code: "en",
    label: "English",
    nativeLabel: "English",
    badge: "EN",
    dir: "ltr",
  },
};

export const DEFAULT_LOCALE: Locale = "fr";

export const dictionaries: Record<Locale, Translations> = {
  fr,
  en,
  ar,
};

export function getDictionary(locale: Locale): Translations {
  return dictionaries[locale] || dictionaries[DEFAULT_LOCALE];
}

export function getDirection(locale: Locale): Direction {
  return LOCALES[locale]?.dir || "ltr";
}
