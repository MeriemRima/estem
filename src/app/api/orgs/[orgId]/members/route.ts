import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireOrgAccess, hashPassword } from "@/lib/auth";

type Params = { params: Promise<{ orgId: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const { orgId } = await params;
    await requireOrgAccess(orgId, ["OWNER", "ADMIN"]);
    const members = await prisma.membership.findMany({
      where: { organizationId: orgId },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { role: "asc" },
    });
    return NextResponse.json(
      members.map((m) => ({
        id: m.id,
        role: m.role,
        user: m.user,
      })),
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : "";
    const status = msg === "UNAUTHORIZED" ? 401 : msg === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ error: msg || "Erreur" }, { status });
  }
}

const inviteSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["ADMIN", "MEMBER"]),
});

/** Owner invite Admin (reçoit cmd) ou Member. */
export async function POST(request: Request, { params }: Params) {
  try {
    const { orgId } = await params;
    await requireOrgAccess(orgId, ["OWNER", "ADMIN"]);
    const body = inviteSchema.parse(await request.json());
    const email = body.email.toLowerCase();

    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          name: body.name,
          email,
          passwordHash: await hashPassword(body.password),
          isSuperAdmin: false,
          mustChangePassword: true,
        },
      });
    }

    const existing = await prisma.membership.findUnique({
      where: { userId_organizationId: { userId: user.id, organizationId: orgId } },
    });
    if (existing) {
      return NextResponse.json({ error: "Déjà membre de ce restaurant" }, { status: 400 });
    }

    const membership = await prisma.membership.create({
      data: {
        userId: user.id,
        organizationId: orgId,
        role: body.role,
      },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    return NextResponse.json({
      id: membership.id,
      role: membership.role,
      user: membership.user,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    }
    const msg = error instanceof Error ? error.message : "";
    const status = msg === "UNAUTHORIZED" ? 401 : msg === "FORBIDDEN" ? 403 : 400;
    return NextResponse.json({ error: msg || "Erreur" }, { status });
  }
}
