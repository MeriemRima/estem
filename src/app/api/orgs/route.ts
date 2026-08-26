import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser, requireSuperAdmin, getUserOrganizations } from "@/lib/auth";

export async function GET() {
  try {
    const user = await requireUser();
    const memberships = await getUserOrganizations(user.id);
    return NextResponse.json({
      user,
      organizations: memberships.map((m) => ({
        id: m.organization.id,
        name: m.organization.name,
        slug: m.organization.slug,
        role: m.role,
      })),
    });
  } catch {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
}

const createSchema = z.object({
  name: z.string().min(2),
});

/** Réservé à l'admin des restaurants (création via /super-admin). */
export async function POST(request: Request) {
  try {
    await requireSuperAdmin();
    const body = createSchema.parse(await request.json());
    const { slugify } = await import("@/lib/utils");
    let slug = slugify(body.name) || "restaurant";
    if (await prisma.organization.findUnique({ where: { slug } })) {
      slug = `${slug}-${Date.now().toString(36)}`;
    }
    const org = await prisma.organization.create({
      data: {
        name: body.name,
        slug,
      },
    });
    return NextResponse.json(org);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    }
    const msg = error instanceof Error ? error.message : "";
    const status = msg === "UNAUTHORIZED" ? 401 : msg === "FORBIDDEN" ? 403 : 400;
    return NextResponse.json({ error: msg || "Erreur" }, { status });
  }
}
