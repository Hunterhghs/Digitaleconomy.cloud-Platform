// Centralized env access with safe defaults so the demo runs end-to-end
// without any external service credentials configured.

export const env = {
  databaseUrl: process.env.DATABASE_URL ?? "file:./dev.db",
  authSecret: process.env.AUTH_SECRET ?? "dev-secret",
  appUrl: process.env.NEXTAUTH_URL ?? "http://localhost:3000",

  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY ?? "",
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? "",
    publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "",
    enabled: Boolean(process.env.STRIPE_SECRET_KEY),
  },

  storage: {
    driver: (process.env.STORAGE_DRIVER ?? "local") as "local" | "s3",
    bucket: process.env.S3_BUCKET ?? "",
    region: process.env.S3_REGION ?? "",
    accessKeyId: process.env.S3_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "",
    endpoint: process.env.S3_ENDPOINT ?? "",
  },

  chain: {
    enabled: process.env.CHAIN_ENABLED === "true",
    name: (process.env.CHAIN_NAME ?? "base-sepolia") as "base" | "base-sepolia",
    rpcUrl: process.env.CHAIN_RPC_URL ?? "",
    receiptContractAddress: process.env.RECEIPT_CONTRACT_ADDRESS ?? "",
    nativeNftContractAddress: process.env.NATIVE_NFT_CONTRACT_ADDRESS ?? "",
    relayerPrivateKey: process.env.RELAYER_PRIVATE_KEY ?? "",
    walletConnectProjectId:
      process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "",
  },

  platform: {
    name: process.env.PLATFORM_NAME ?? "Digitaleconomy.cloud",
    adminEmail: process.env.PLATFORM_ADMIN_EMAIL ?? "admin@example.com",
    adminPassword: process.env.PLATFORM_ADMIN_PASSWORD ?? "admin1234",
  },
} as const;
