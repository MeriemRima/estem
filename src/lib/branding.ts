import type { CSSProperties } from "react";

export type BrandTemplate = "classic" | "modern" | "warm";
export type MenuFormat = "standard" | "book";
export type TextFont = "classic" | "elegant" | "modern" | "soft" | "bold";

export type Branding = {
  brandName: string;
  logoUrl: string;
  /** Photo bannière menu client */
  menuCoverUrl: string;
  /** Affichage menu : liste ou livre papier */
  menuFormat: MenuFormat;
  /** Police titres + corps */
  textFont: TextFont;
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  template: BrandTemplate;
};

export const DEFAULT_BRANDING: Branding = {
  brandName: "",
  logoUrl: "",
  menuCoverUrl: "",
  menuFormat: "standard",
  textFont: "classic",
  primaryColor: "#c2410c",
  secondaryColor: "#1c1917",
  backgroundColor: "#f3efe6",
  template: "classic",
};

export const TEMPLATES: {
  id: BrandTemplate;
  label: string;
  description: string;
  preview: { primary: string; secondary: string; background: string };
}[] = [
  {
    id: "classic",
    label: "Classique",
    description: "Chaud, terracotta — idéal resto traditionnel",
    preview: { primary: "#c2410c", secondary: "#1c1917", background: "#f3efe6" },
  },
  {
    id: "modern",
    label: "Moderne",
    description: "Contraste fort, look contemporain",
    preview: { primary: "#0f766e", secondary: "#0f172a", background: "#f8fafc" },
  },
  {
    id: "warm",
    label: "Chaleureux",
    description: "Tons café / épices",
    preview: { primary: "#b45309", secondary: "#451a03", background: "#fff7ed" },
  },
];

export const MENU_FORMATS: {
  id: MenuFormat;
  label: string;
  description: string;
}[] = [
  {
    id: "standard",
    label: "Menu standard",
    description: "Liste scrollable classique (comme maintenant)",
  },
  {
    id: "book",
    label: "Menu livre",
    description: "Pages format papier à feuilleter",
  },
];

/** Polices de texte — variables CSS chargées dans layout.tsx */
export const TEXT_FONTS: {
  id: TextFont;
  label: string;
  description: string;
  /** Variable CSS titres (next/font) */
  displayVar: string;
  /** Variable CSS corps / mono UI */
  bodyVar: string;
  sample: string;
}[] = [
  {
    id: "classic",
    label: "Classique",
    description: "Serif élégant + sans lisible",
    displayVar: "--font-fraunces",
    bodyVar: "--font-source",
    sample: "Aa Menu du jour",
  },
  {
    id: "elegant",
    label: "Élégant",
    description: "Titres raffinés, corps doux",
    displayVar: "--font-playfair",
    bodyVar: "--font-lora",
    sample: "Aa Carte signature",
  },
  {
    id: "modern",
    label: "Moderne",
    description: "Géométrique, net et contemporain",
    displayVar: "--font-space",
    bodyVar: "--font-dm",
    sample: "Aa Fast & fresh",
  },
  {
    id: "soft",
    label: "Doux",
    description: "Arrondi, friendly brunch / café",
    displayVar: "--font-nunito",
    bodyVar: "--font-nunito",
    sample: "Aa Petit-déj",
  },
  {
    id: "bold",
    label: "Impact",
    description: "Titres forts, look street food",
    displayVar: "--font-oswald",
    bodyVar: "--font-barlow",
    sample: "Aa BIG BITES",
  },
];

function darkenHex(hex: string, amount = 0.18) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const r = Math.max(0, Math.round(((n >> 16) & 255) * (1 - amount)));
  const g = Math.max(0, Math.round(((n >> 8) & 255) * (1 - amount)));
  const b = Math.max(0, Math.round((n & 255) * (1 - amount)));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

export function normalizeBranding(
  input: {
    brandName?: string | null;
    logoUrl?: string | null;
    menuCoverUrl?: string | null;
    menuFormat?: string | null;
    textFont?: string | null;
    primaryColor?: string | null;
    secondaryColor?: string | null;
    backgroundColor?: string | null;
    template?: string | null;
  } | null | undefined,
): Branding {
  const template = (["classic", "modern", "warm"].includes(input?.template ?? "")
    ? input!.template
    : DEFAULT_BRANDING.template) as BrandTemplate;
  const menuFormat = (["standard", "book"].includes(input?.menuFormat ?? "")
    ? input!.menuFormat
    : DEFAULT_BRANDING.menuFormat) as MenuFormat;
  const textFont = (TEXT_FONTS.some((f) => f.id === input?.textFont)
    ? input!.textFont
    : DEFAULT_BRANDING.textFont) as TextFont;
  return {
    brandName: input?.brandName?.trim() || "",
    logoUrl: input?.logoUrl || "",
    menuCoverUrl: input?.menuCoverUrl || "",
    menuFormat,
    textFont,
    primaryColor: input?.primaryColor || DEFAULT_BRANDING.primaryColor,
    secondaryColor: input?.secondaryColor || DEFAULT_BRANDING.secondaryColor,
    backgroundColor: input?.backgroundColor || DEFAULT_BRANDING.backgroundColor,
    template,
  };
}

export function displayBrandName(orgName: string, brandName?: string | null) {
  return brandName?.trim() || orgName;
}

export function resolveTextFont(textFont: TextFont) {
  return TEXT_FONTS.find((f) => f.id === textFont) ?? TEXT_FONTS[0];
}

/** CSS variables for restaurant-scoped theme (admin + client). */
export function brandingStyle(branding: Branding): CSSProperties {
  const primary = branding.primaryColor;
  const font = resolveTextFont(branding.textFont);
  const display = `var(${font.displayVar}), Georgia, serif`;
  const body = `var(${font.bodyVar}), system-ui, sans-serif`;
  return {
    ["--brand" as string]: primary,
    ["--brand-dark" as string]: darkenHex(primary),
    ["--ink" as string]: branding.secondaryColor,
    ["--bg" as string]: branding.backgroundColor,
    ["--card" as string]: "#fffdf8",
    ["--line" as string]: `${primary}33`,
    ["--font-display" as string]: display,
    ["--font-mono" as string]: body,
    fontFamily: display,
    background: `radial-gradient(circle at top left, ${primary}22, transparent 42%), linear-gradient(180deg, ${branding.backgroundColor} 0%, ${branding.backgroundColor} 100%)`,
    color: branding.secondaryColor,
    minHeight: "100vh",
  };
}
