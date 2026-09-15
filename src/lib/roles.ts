/** Libellés métier (UI) — les rôles Prisma restent OWNER / ADMIN / MEMBER. */

export const PLATFORM_ROLE_LABEL = "Admin des restaurants";
export const PLATFORM_ROLE_SHORT = "Créateur";
export const VENDEUR_ROLE_LABEL = "Account Manager (Vendeur)";

export function roleLabel(role: string, isPlatformAdmin = false, isVendeur = false) {
  if (isPlatformAdmin) return PLATFORM_ROLE_LABEL;
  if (isVendeur) return VENDEUR_ROLE_LABEL;
  switch (role) {
    case "OWNER":
      return "Gérant";
    case "ADMIN":
      return "Responsable";
    case "MEMBER":
      return "Équipe";
    default:
      return role;
  }
}

export function roleHint(role: string) {
  switch (role) {
    case "OWNER":
      return "Gestion des commandes et de la cuisine";
    case "ADMIN":
      return "Commandes et cuisine";
    case "MEMBER":
      return "Commandes cuisine uniquement";
    default:
      return "";
  }
}
