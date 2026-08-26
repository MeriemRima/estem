import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireOrgAccess } from "@/lib/auth";

type Params = { params: Promise<{ orgId: string }> };

const tableSchema = z.object({
  name: z.string().min(1),
});

export async function GET(_request: Request, { params }: Params) {
  try {
    const { orgId } = await params;
    await requireOrgAccess(orgId);
    const tables = await prisma.diningTable.findMany({
      where: { organizationId: orgId },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(tables);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "";
    const status = msg === "UNAUTHORIZED" ? 401 : msg === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ error: msg || "Erreur" }, { status });
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const { orgId } = await params;
    await requireOrgAccess(orgId, ["OWNER", "ADMIN"]);
    const body = tableSchema.parse(await request.json());
    const table = await prisma.diningTable.create({
      data: {
        name: body.name,
        organizationId: orgId,
      },
    });
    return NextResponse.json(table);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "";
    const status = msg === "UNAUTHORIZED" ? 401 : msg === "FORBIDDEN" ? 403 : 400;
    return NextResponse.json({ error: msg || "Erreur" }, { status });
  }
}
