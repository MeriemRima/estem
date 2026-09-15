import type { Metadata, Viewport } from "next";
import type { CSSProperties } from "react";
import { cookies } from "next/headers";
import {
  Barlow,
  DM_Sans,
  Fraunces,
  Lora,
  Nunito,
  Oswald,
  Playfair_Display,
  Source_Sans_3,
  Space_Grotesk,
} from "next/font/google";
import { I18nProvider } from "@/lib/i18n/i18n-context";
import { DEFAULT_LOCALE, getDirection } from "@/lib/i18n";
import { Locale } from "@/lib/i18n/types";
import "./globals.css";

const fraunces = Fraunces({ variable: "--font-fraunces", subsets: ["latin"] });
const source = Source_Sans_3({ variable: "--font-source", subsets: ["latin"] });
const playfair = Playfair_Display({ variable: "--font-playfair", subsets: ["latin"] });
const lora = Lora({ variable: "--font-lora", subsets: ["latin"] });
const space = Space_Grotesk({ variable: "--font-space", subsets: ["latin"] });
const dm = DM_Sans({ variable: "--font-dm", subsets: ["latin"] });
const nunito = Nunito({ variable: "--font-nunito", subsets: ["latin"] });
const oswald = Oswald({ variable: "--font-oswald", subsets: ["latin"] });
const barlow = Barlow({
  variable: "--font-barlow",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

export const metadata: Metadata = {
  title: "Estem — Commandes restaurant",
  description: "SaaS multi-tenant : menu, QR tables, cuisine en temps réel",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

const fontVars = [
  fraunces.variable,
  source.variable,
  playfair.variable,
  lora.variable,
  space.variable,
  dm.variable,
  nunito.variable,
  oswald.variable,
  barlow.variable,
].join(" ");

const rootFontStyle = {
  ["--font-display" as string]: "var(--font-fraunces), Georgia, serif",
  ["--font-mono" as string]: "var(--font-source), system-ui, sans-serif",
} as CSSProperties;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const rawLocale = cookieStore.get("NEXT_LOCALE")?.value as Locale | undefined;
  const initialLocale: Locale =
    rawLocale === "ar" || rawLocale === "en" || rawLocale === "fr" ? rawLocale : DEFAULT_LOCALE;
  const initialDir = getDirection(initialLocale);

  return (
    <html
      lang={initialLocale}
      dir={initialDir}
      className={`${fontVars} h-full`}
      style={rootFontStyle}
      suppressHydrationWarning
    >
      <body className="min-h-full antialiased" suppressHydrationWarning>
        <I18nProvider initialLocale={initialLocale}>{children}</I18nProvider>
      </body>
    </html>
  );
}
