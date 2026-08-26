import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { requireOrgAccess } from "@/lib/auth";

type Params = { params: Promise<{ orgId: string }> };

export async function POST(request: Request, { params }: Params) {
  try {
    const { orgId } = await params;
    await requireOrgAccess(orgId, ["OWNER", "ADMIN"]);
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Fichier manquant" }, { status: 400 });
    }
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Image uniquement" }, { status: 400 });
    }
    if (file.size > 2_000_000) {
      return NextResponse.json({ error: "Max 2 Mo" }, { status: 400 });
    }

    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const dir = path.join(process.cwd(), "public", "uploads", orgId);
    await mkdir(dir, { recursive: true });
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(dir, filename), buffer);
    const url = `/uploads/${orgId}/${filename}`;
    return NextResponse.json({ url });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "";
    const status = msg === "UNAUTHORIZED" ? 401 : msg === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ error: msg || "Erreur upload" }, { status });
  }
}
