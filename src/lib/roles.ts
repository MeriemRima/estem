/** Libellés métier (UI) — les rôles Prisma restent OWNER / ADMIN / MEMBER. */

export const PLATFORM_ROLE_LABEL = "Admin des restaurants";
export const PLATFORM_ROLE_SHORT = "Créateur";

export function roleLabel(role: string, isPlatformAdmin = false) {
  if (isPlatformAdmin) return PLATFORM_ROLE_LABEL;
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
      return "Accès complet à son restaurant uniquement";
    case "ADMIN":
      return "Menu, tables et commandes du restaurant";
    case "MEMBER":
      return "Commandes cuisine uniquement";
    default:
      return "";
  }
}
