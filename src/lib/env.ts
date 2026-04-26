// Centralized env access with safe defaults. The platform should run with the
// minimum: DATABASE_URL + AUTH_SECRET. Everything else has sane fallbacks.

const isVercel = process.env.VERCEL === "1";
const explicitUploadsEnabled = process.env.UPLOADS_ENABLED;

// Uploads need a writable filesystem (local-fs driver) OR object storage.
// Auto-disable on Vercel because its serverless filesystem is read-only and
// we haven't wired up Vercel Blob / R2 yet. Override with UPLOADS_ENABLED=true
// once a writable storage driver is configured.
function uploadsEnabled(): boolean {
  if (explicitUploadsEnabled === "true") return true;
  if (explicitUploadsEnabled === "false") return false;
  return !isVercel;
}

export const env = {
  databaseUrl: process.env.DATABASE_URL ?? "",
  authSecret: process.env.AUTH_SECRET ?? "dev-secret",
  appUrl: process.env.NEXTAUTH_URL ?? "http://localhost:3000",
  isVercel,

  storage: {
    driver: (process.env.STORAGE_DRIVER ?? "local") as "local" | "s3",
    bucket: process.env.S3_BUCKET ?? "",
    region: process.env.S3_REGION ?? "",
    accessKeyId: process.env.S3_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "",
    endpoint: process.env.S3_ENDPOINT ?? "",
  },

  // On-chain layer is dormant in the nonprofit/free phase. Kept here so the
  // storefront can flip back to receipt minting later without code changes.
  chain: {
    enabled: process.env.CHAIN_ENABLED === "true",
    name: (process.env.CHAIN_NAME ?? "base-sepolia") as "base" | "base-sepolia",
    rpcUrl: process.env.CHAIN_RPC_URL ?? "",
    receiptContractAddress: process.env.RECEIPT_CONTRACT_ADDRESS ?? "",
    nativeNftContractAddress: process.env.NATIVE_NFT_CONTRACT_ADDRESS ?? "",
    relayerPrivateKey: process.env.RELAYER_PRIVATE_KEY ?? "",
  },

  uploads: {
    enabled: uploadsEnabled(),
    maxBytes: Number(process.env.UPLOAD_MAX_BYTES ?? 50 * 1024 * 1024), // 50 MB
  },

  platform: {
    name: process.env.PLATFORM_NAME ?? "Digitaleconomy.cloud",
    adminEmail: process.env.PLATFORM_ADMIN_EMAIL ?? "admin@example.com",
    adminPassword: process.env.PLATFORM_ADMIN_PASSWORD ?? "admin1234",
  },
} as const;
