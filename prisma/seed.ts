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
      custodialWalletAddress: `0xadmin${"0".repeat(35)}`,
    },
  });
}

type SeedAsset = {
  slug: string;
  title: string;
  description: string;
  category: string;
  tagsCsv: string;
  priceUsdCents: number;
  creatorName: string;
  license: string;
  previewUrl: string | null;
  kind: "file" | "nft_native";
  deliveryConfig: ReturnType<typeof encodeDeliveryConfig>;
};

function buildAssets(): SeedAsset[] {
  const assets: SeedAsset[] = [];

  const fileSeeds: Array<{
    slug: string;
    title: string;
    creator: string;
    category: string;
    tags: string;
    priceUsdCents: number;
    description: string;
    fileName: string;
    mimeType: string;
    body: string;
  }> = [
    {
      slug: "neon-grid-textures-pack",
      title: "Neon Grid Textures Pack",
      creator: "Vector Atelier",
      category: "Images",
      tags: "neon,grid,texture,vector",
      priceUsdCents: 1499,
      description:
        "16 high-resolution neon grid textures, perfect for product UI mockups, music covers, and motion design backplates.",
      fileName: "neon-grid-textures.txt",
      mimeType: "application/zip",
      body: "Demo placeholder for neon-grid-textures.zip\n",
    },
    {
      slug: "lo-fi-study-loops-vol-2",
      title: "Lo-fi Study Loops Vol. 2",
      creator: "Brick Studios",
      category: "Audio",
      tags: "lo-fi,beats,loops,wav",
      priceUsdCents: 999,
      description:
        "30 hand-crafted lo-fi loops + drum stems. Royalty-free for personal projects; commercial license available on request.",
      fileName: "lofi-loops-vol2.txt",
      mimeType: "audio/wav",
      body: "Demo placeholder for lofi-loops-vol2.wav\n",
    },
    {
      slug: "interface-icon-set-200",
      title: "Interface Icon Set (200 SVGs)",
      creator: "Pixel Cartel",
      category: "UI Kits",
      tags: "icons,svg,ui,design",
      priceUsdCents: 2499,
      description:
        "200 pixel-perfect SVG icons across navigation, commerce, communication, and finance categories. MIT-style license included.",
      fileName: "icon-set-200.txt",
      mimeType: "application/zip",
      body: "Demo placeholder for icon-set-200.zip\n",
    },
    {
      slug: "blender-isometric-room",
      title: "Blender Isometric Room (.blend)",
      creator: "Cube Workshop",
      category: "3D",
      tags: "blender,3d,isometric,scene",
      priceUsdCents: 1899,
      description:
        "A fully rigged Blender scene of a cozy isometric room. Materials, lights, and camera presets included.",
      fileName: "iso-room.txt",
      mimeType: "application/x-blender",
      body: "Demo placeholder for iso-room.blend\n",
    },
    {
      slug: "next-saas-starter-template",
      title: "Next.js SaaS Starter Template",
      creator: "Indie Foundry",
      category: "Code",
      tags: "next.js,saas,template,typescript",
      priceUsdCents: 4900,
      description:
        "Production-ready Next.js + Postgres + Stripe SaaS starter with auth, billing, and dashboards. MIT license, lifetime updates.",
      fileName: "next-saas-starter.txt",
      mimeType: "application/zip",
      body: "Demo placeholder for next-saas-starter.zip\n",
    },
    {
      slug: "founder-handbook-2026",
      title: "The Founder Handbook 2026 (eBook)",
      creator: "Mara Cohen",
      category: "eBooks",
      tags: "ebook,startup,founder",
      priceUsdCents: 1500,
      description:
        "300 pages of practical advice on shipping, hiring, fundraising, and avoiding the avoidable. PDF + ePub.",
      fileName: "founder-handbook.txt",
      mimeType: "application/pdf",
      body: "Demo placeholder for founder-handbook.pdf\n",
    },
  ];

  for (const f of fileSeeds) {
    const size = writeSampleFile(f.fileName, f.body);
    assets.push({
      slug: f.slug,
      title: f.title,
      description: f.description,
      category: f.category,
      tagsCsv: f.tags,
      priceUsdCents: f.priceUsdCents,
      creatorName: f.creator,
      license: "personal",
      previewUrl: null,
      kind: "file",
      deliveryConfig: encodeDeliveryConfig("file", {
        fileKey: f.fileName,
        fileSizeBytes: size,
        mimeType: f.mimeType,
      }),
    });
  }

  const nftSeeds: Array<{
    slug: string;
    title: string;
    creator: string;
    category: string;
    tags: string;
    priceUsdCents: number;
    description: string;
    contract: string;
    tokenId: number;
    maxSupply: number;
    metadataUri: string;
  }> = [
    {
      slug: "harbor-lights-edition",
      title: "Harbor Lights (Edition of 250)",
      creator: "Renee Park",
      category: "Art",
      tags: "art,collectible,erc-1155,limited",
      priceUsdCents: 7500,
      description:
        "An ERC-1155 limited edition photographic NFT. The token IS the asset; minted directly to your wallet at checkout.",
      contract: "0xNATIVE000000000000000000000000000000000A",
      tokenId: 1,
      maxSupply: 250,
      metadataUri: "ipfs://placeholder/harbor-lights/1",
    },
    {
      slug: "open-genesis-loop",
      title: "Open Genesis Loop",
      creator: "DAO Synth Co.",
      category: "Music",
      tags: "music,loop,nft,collectible",
      priceUsdCents: 4500,
      description:
        "A 16-bar generative music loop minted as an open-edition NFT. Hold it, remix it, build on it.",
      contract: "0xNATIVE000000000000000000000000000000000A",
      tokenId: 2,
      maxSupply: 10000,
      metadataUri: "ipfs://placeholder/open-genesis/2",
    },
    {
      slug: "founders-pass-001",
      title: "Founders Pass 001",
      creator: "Digitaleconomy.cloud",
      category: "Membership",
      tags: "pass,founder,nft",
      priceUsdCents: 12000,
      description:
        "A founding-member NFT for the platform. Holders get early access to new asset kinds and creator drops.",
      contract: "0xNATIVE000000000000000000000000000000000A",
      tokenId: 3,
      maxSupply: 500,
      metadataUri: "ipfs://placeholder/founders-pass/3",
    },
  ];

  for (const n of nftSeeds) {
    assets.push({
      slug: n.slug,
      title: n.title,
      description: n.description,
      category: n.category,
      tagsCsv: n.tags,
      priceUsdCents: n.priceUsdCents,
      creatorName: n.creator,
      license: "nft-license-1.0",
      previewUrl: null,
      kind: "nft_native",
      deliveryConfig: encodeDeliveryConfig("nft_native", {
        contractAddress: n.contract,
        tokenStandard: "erc1155",
        maxSupply: n.maxSupply,
        metadataUri: n.metadataUri,
        tokenIdSeed: n.tokenId,
      }),
    });
  }

  return assets;
}

async function main() {
  console.log("Seeding database...");
  await upsertAdmin();
  console.log(`  admin: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);

  const seeds = buildAssets();
  for (const s of seeds) {
    await prisma.asset.upsert({
      where: { slug: s.slug },
      update: {
        title: s.title,
        description: s.description,
        category: s.category,
        tagsCsv: s.tagsCsv,
        priceUsdCents: s.priceUsdCents,
        creatorName: s.creatorName,
        license: s.license,
        previewUrl: s.previewUrl,
        kind: s.kind,
        deliveryConfig: s.deliveryConfig,
        status: "published",
      },
      create: {
        slug: s.slug,
        title: s.title,
        description: s.description,
        category: s.category,
        tagsCsv: s.tagsCsv,
        priceUsdCents: s.priceUsdCents,
        creatorName: s.creatorName,
        license: s.license,
        previewUrl: s.previewUrl,
        kind: s.kind,
        deliveryConfig: s.deliveryConfig,
        status: "published",
      },
    });
  }
  console.log(`  assets: ${seeds.length} (${seeds.filter((s) => s.kind === "file").length} files, ${seeds.filter((s) => s.kind === "nft_native").length} NFTs)`);
  console.log("Done.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
