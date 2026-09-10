import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireOrgAccess } from "@/lib/auth";

type Params = { params: Promise<{ orgId: string }> };

const tableSchema = z.union([
  z.object({
    name: z.string().min(1),
  }),
  z.object({
    count: z.number().int().min(1).max(100),
    prefix: z.string().optional().default("Table"),
    startFrom: z.number().int().min(1).optional().default(1),
  }),
]);

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

    if ("count" in body) {
      const prefix = body.prefix?.trim() || "Table";
      const count = body.count;
      const startFrom = body.startFrom ?? 1;
      const padLength = Math.max(2, String(startFrom + count - 1).length);

      const names: string[] = [];
      for (let i = 0; i < count; i++) {
        const num = startFrom + i;
        const formattedNum = String(num).padStart(padLength, "0");
        names.push(`${prefix} ${formattedNum}`);
      }

      const createdTables = await prisma.$transaction(
        names.map((name) =>
          prisma.diningTable.create({
            data: {
              name,
              organizationId: orgId,
            },
          }),
        ),
      );

      return NextResponse.json(createdTables);
    }

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
