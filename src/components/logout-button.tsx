"use client";

import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/i18n-context";

export function LogoutButton() {
  const router = useRouter();
  const { t } = useI18n();

  return (
    <button
      className="btn btn-ghost"
      onClick={async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        router.push("/login");
        router.refresh();
      }}
    >
      {t.nav.logout}
    </button>
  );
}
