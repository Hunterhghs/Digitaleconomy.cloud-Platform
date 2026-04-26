import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { env } from "@/lib/env";
import { encodeDeliveryConfig } from "@/types/delivery";

export const runtime = "nodejs";

const META = z.object({
  title: z.string().trim().min(2).max(120),
  description: z.string().trim().min(10).max(4000),
  category: z.string().trim().min(2).max(40),
  creatorName: z.string().trim().min(1).max(80),
  tags: z.string().trim().max(200).optional().default(""),
  license: z.string().trim().min(1).max(40),
});

const BLOCKED_EXT = new Set([
  "exe", "dll", "bat", "cmd", "com", "scr", "msi", "ps1", "vbs", "sh", "app",
]);

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function safeFilename(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);
}

function extOf(name: string) {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i + 1).toLowerCase() : "";
}

export async function POST(req: Request) {
  if (!env.uploads.enabled) {
    return NextResponse.json(
      {
        error:
          "Uploads aren't enabled on this deployment yet. The platform admin needs to wire up object storage (Vercel Blob, Cloudflare R2, or S3) before uploads can be turned back on.",
      },
      { status: 503 },
    );
  }

  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart form data" }, { status: 400 });
  }

  const meta = META.safeParse({
    title: form.get("title"),
    description: form.get("description"),
    category: form.get("category"),
    creatorName: form.get("creatorName"),
    tags: form.get("tags") ?? "",
    license: form.get("license"),
  });
  if (!meta.success) {
    return NextResponse.json(
      { error: meta.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") },
      { status: 400 },
    );
  }

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }
  if (file.size > env.uploads.maxBytes) {
    return NextResponse.json(
      { error: `File exceeds ${env.uploads.maxBytes} byte limit` },
      { status: 413 },
    );
  }

  const ext = extOf(file.name);
  if (ext && BLOCKED_EXT.has(ext)) {
    return NextResponse.json(
      { error: `Files with .${ext} extension are not allowed.` },
      { status: 400 },
    );
  }

  // Slug uniqueness: try the base, then append a short random suffix on
  // collision. Only writes the file once we have a slug + key reserved.
  const base = slugify(meta.data.title) || "asset";
  let slug = base;
  for (let i = 0; i < 5; i++) {
    const collision = await db.asset.findUnique({ where: { slug } });
    if (!collision) break;
    slug = `${base}-${randomBytes(2).toString("hex")}`;
  }

  // Single-segment fileKey (the storage GET route is `/[fileKey]`, not catch-all),
  // namespaced enough to avoid local-fs collisions across uploaders.
  const fileKey = `${user.id.slice(0, 8)}-${Date.now().toString(36)}-${safeFilename(file.name)}`;

  const localRoot = join(process.cwd(), "storage", "local");
  await mkdir(localRoot, { recursive: true });
  const buf = Buffer.from(await file.arrayBuffer());
  await writeFile(join(localRoot, fileKey), buf);

  const tagsCsv = meta.data.tags
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 12)
    .join(",");

  const asset = await db.asset.create({
    data: {
      slug,
      title: meta.data.title,
      description: meta.data.description,
      category: meta.data.category,
      tagsCsv,
      priceUsdCents: 0,
      creatorName: meta.data.creatorName,
      license: meta.data.license,
      previewUrl: null,
      kind: "file",
      status: "published",
      uploaderUserId: user.id,
      deliveryConfig: encodeDeliveryConfig("file", {
        fileKey,
        fileSizeBytes: file.size,
        mimeType: file.type || "application/octet-stream",
      }),
    },
  });

  return NextResponse.json({ slug: asset.slug, id: asset.id });
}
