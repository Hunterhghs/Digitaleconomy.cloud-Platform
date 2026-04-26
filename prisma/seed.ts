import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { hash } from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { encodeDeliveryConfig } from "../src/types/delivery";

const prisma = new PrismaClient();

const ADMIN_EMAIL = process.env.PLATFORM_ADMIN_EMAIL ?? "admin@example.com";
const ADMIN_PASSWORD = process.env.PLATFORM_ADMIN_PASSWORD ?? "admin1234";
const STORAGE_ROOT = join(process.cwd(), "storage", "local");

function ensureStorage() {
  if (!existsSync(STORAGE_ROOT)) mkdirSync(STORAGE_ROOT, { recursive: true });
}

function writeSampleFile(fileKey: string, content: string) {
  ensureStorage();
  writeFileSync(join(STORAGE_ROOT, fileKey), content);
  return Buffer.byteLength(content);
}

async function upsertAdmin() {
  const passwordHash = await hash(ADMIN_PASSWORD, 10);
  return prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: { passwordHash, role: "admin" },
    create: {
      email: ADMIN_EMAIL,
      passwordHash,
      name: "Platform Admin",
      role: "admin",
    },
  });
}

type FileSeed = {
  slug: string;
  title: string;
  creator: string;
  category: string;
  tags: string;
  description: string;
  fileName: string;
  mimeType: string;
  body: string;
  license: string;
};

function buildAssets(): FileSeed[] {
  return [
    {
      slug: "neon-grid-textures-pack",
      title: "Neon Grid Textures Pack",
      creator: "Vector Atelier",
      category: "Images",
      tags: "neon,grid,texture,vector,background",
      description:
        "16 high-resolution neon grid textures, perfect for product UI mockups, music covers, and motion design backplates. Free to use - attribution appreciated but not required.",
      fileName: "neon-grid-textures.txt",
      mimeType: "application/zip",
      body: "Demo placeholder for neon-grid-textures.zip\n",
      license: "cc-by",
    },
    {
      slug: "lo-fi-study-loops-vol-2",
      title: "Lo-fi Study Loops Vol. 2",
      creator: "Brick Studios",
      category: "Audio",
      tags: "lo-fi,beats,loops,wav,music",
      description:
        "30 hand-crafted lo-fi loops + drum stems. Use them in your videos, study playlists, or DJ sets - no charge, no signup.",
      fileName: "lofi-loops-vol2.txt",
      mimeType: "audio/wav",
      body: "Demo placeholder for lofi-loops-vol2.wav\n",
      license: "cc-by",
    },
    {
      slug: "interface-icon-set-200",
      title: "Interface Icon Set (200 SVGs)",
      creator: "Pixel Cartel",
      category: "UI Kits",
      tags: "icons,svg,ui,design,interface",
      description:
        "200 pixel-perfect SVG icons across navigation, commerce, communication, and finance categories. MIT-licensed and free to drop into any project.",
      fileName: "icon-set-200.txt",
      mimeType: "application/zip",
      body: "Demo placeholder for icon-set-200.zip\n",
      license: "mit",
    },
    {
      slug: "blender-isometric-room",
      title: "Blender Isometric Room (.blend)",
      creator: "Cube Workshop",
      category: "3D",
      tags: "blender,3d,isometric,scene,model",
      description:
        "A fully rigged Blender scene of a cozy isometric room. Materials, lights, and camera presets included. Use it for renders, learning, or as a starting scene.",
      fileName: "iso-room.txt",
      mimeType: "application/x-blender",
      body: "Demo placeholder for iso-room.blend\n",
      license: "cc-by",
    },
    {
      slug: "next-saas-starter-template",
      title: "Next.js SaaS Starter Template",
      creator: "Indie Foundry",
      category: "Code",
      tags: "next.js,saas,template,typescript,starter",
      description:
        "Production-shaped Next.js + Postgres + Auth.js SaaS starter with sensible defaults. MIT-licensed - clone, ship, contribute back.",
      fileName: "next-saas-starter.txt",
      mimeType: "application/zip",
      body: "Demo placeholder for next-saas-starter.zip\n",
      license: "mit",
    },
    {
      slug: "founder-handbook-2026",
      title: "The Founder Handbook 2026 (eBook)",
      creator: "Mara Cohen",
      category: "eBooks",
      tags: "ebook,startup,founder,pdf,reading",
      description:
        "300 pages of practical advice on shipping, hiring, fundraising, and avoiding the avoidable. Originally a paid ebook - now released for free as a community contribution.",
      fileName: "founder-handbook.txt",
      mimeType: "application/pdf",
      body: "Demo placeholder for founder-handbook.pdf\n",
      license: "cc-by-nc",
    },
  ];
}

async function main() {
  console.log("Seeding database...");
  const admin = await upsertAdmin();
  console.log(`  admin: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);

  const seeds = buildAssets();
  for (const f of seeds) {
    const size = writeSampleFile(f.fileName, f.body);
    const deliveryConfig = encodeDeliveryConfig("file", {
      fileKey: f.fileName,
      fileSizeBytes: size,
      mimeType: f.mimeType,
    });
    await prisma.asset.upsert({
      where: { slug: f.slug },
      update: {
        title: f.title,
        description: f.description,
        category: f.category,
        tagsCsv: f.tags,
        priceUsdCents: 0,
        creatorName: f.creator,
        license: f.license,
        previewUrl: null,
        kind: "file",
        deliveryConfig,
        status: "published",
        uploaderUserId: admin.id,
      },
      create: {
        slug: f.slug,
        title: f.title,
        description: f.description,
        category: f.category,
        tagsCsv: f.tags,
        priceUsdCents: 0,
        creatorName: f.creator,
        license: f.license,
        previewUrl: null,
        kind: "file",
        deliveryConfig,
        status: "published",
        uploaderUserId: admin.id,
      },
    });
  }
  console.log(`  assets: ${seeds.length} free downloads, all attributed to ${admin.email}`);
  console.log("Done.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
