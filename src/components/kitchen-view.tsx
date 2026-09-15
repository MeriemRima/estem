"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n/i18n-context";
import { RestaurantShell } from "@/components/restaurant-shell";
import { KitchenBoard, type KitchenOrder } from "@/components/kitchen-board";
import { LogoutButton } from "@/components/logout-button";
import { roleLabel } from "@/lib/roles";
import type { Branding } from "@/lib/branding";

export function KitchenView({
  orgId,
  orgName,
  branding,
  slug,
  role,
  isPlatformAdmin,
  isVendeur,
  initialOrders,
  pendingOrders,
}: {
  orgId: string;
  orgName: string;
  branding: Branding;
  slug: string;
  role: string;
  isPlatformAdmin: boolean;
  isVendeur: boolean;
  initialOrders: KitchenOrder[];
  pendingOrders: number;
}) {
  const { t } = useI18n();
  const displayRole = roleLabel(role, isPlatformAdmin, isVendeur, t);

  return (
    <RestaurantShell
      orgId={orgId}
      orgName={orgName}
      branding={branding}
      active="kitchen"
      backHref={`/dashboard/${orgId}`}
      backLabel={t.pages.backToResto}
      roleLabel={displayRole}
      slug={slug}
      pendingOrders={pendingOrders}
      headerActions={
        <>
          {isPlatformAdmin ? (
            <Link href="/super-admin" className="btn btn-ghost">
              {t.roles.platformAdmin}
            </Link>
          ) : isVendeur ? (
            <Link href="/vendeur" className="btn btn-ghost">
              {t.pages.vendeurSpace}
            </Link>
          ) : null}
          <LogoutButton />
        </>
      }
    >
      <KitchenBoard
        orgId={orgId}
        initialOrders={initialOrders}
        restaurantName={orgName}
      />
    </RestaurantShell>
  );
}
