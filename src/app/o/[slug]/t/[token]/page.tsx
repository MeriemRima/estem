import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { CustomerMenu } from "@/components/customer-menu";
import { displayBrandName, normalizeBranding } from "@/lib/branding";

type Props = { params: Promise<{ slug: string; token: string }> };

export default async function PublicOrderPage({ params }: Props) {
  const { slug, token } = await params;
  const table = await prisma.diningTable.findFirst({
    where: { token, organization: { slug } },
    include: {
      organization: {
        include: {
          categories: {
            orderBy: { sortOrder: "asc" },
            include: {
              items: { where: { available: true }, orderBy: { name: "asc" } },
            },
          },
        },
      },
    },
  });
  if (!table) notFound();

  const branding = normalizeBranding(table.organization);

  return (
    <CustomerMenu
      slug={slug}
      token={token}
      restaurantName={displayBrandName(table.organization.name, table.organization.brandName)}
      tableName={table.name}
      categories={table.organization.categories}
      branding={branding}
    />
  );
}
