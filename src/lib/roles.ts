import type { Translations } from "@/lib/i18n/types";
import { fr } from "@/lib/i18n/dictionaries/fr";

export const PLATFORM_ROLE_LABEL = fr.roles.platformAdmin;
export const PLATFORM_ROLE_SHORT = fr.roles.platformShort;
export const VENDEUR_ROLE_LABEL = fr.roles.vendeur;

export function roleLabel(role: string, isPlatformAdmin = false, isVendeur = false, t?: Translations) {
  const roles = t ? t.roles : fr.roles;
  if (isPlatformAdmin) return roles.platformAdmin;
  if (isVendeur) return roles.vendeur;
  switch (role) {
    case "OWNER":
      return roles.owner;
    case "ADMIN":
      return roles.admin;
    case "MEMBER":
      return roles.member;
    default:
      return role;
  }
}

export function roleHint(role: string, t?: Translations) {
  const roles = t ? t.roles : fr.roles;
  switch (role) {
    case "OWNER":
      return roles.ownerHint;
    case "ADMIN":
      return roles.adminHint;
    case "MEMBER":
      return roles.memberHint;
    default:
      return "";
  }
}

