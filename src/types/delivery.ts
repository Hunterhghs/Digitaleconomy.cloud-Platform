import { z } from "zod";

// The full set of asset kinds the platform is *designed* to support.
// v1 ships handlers for `file` and `nft_native`; the rest are reserved
// so the type system, dispatcher, and DB are ready for them.
export const ASSET_KINDS = [
  "file",
  "nft_native",
  "stream",
  "license_key",
  "ai_asset",
  "bundle",
] as const;

export type AssetKind = (typeof ASSET_KINDS)[number];

export const FileDeliveryConfig = z.object({
  fileKey: z.string().min(1),
  fileSizeBytes: z.number().int().nonnegative(),
  mimeType: z.string().min(1),
});
export type FileDeliveryConfig = z.infer<typeof FileDeliveryConfig>;

export const NftNativeDeliveryConfig = z.object({
  contractAddress: z.string().min(1),
  tokenStandard: z.enum(["erc721", "erc1155"]),
  maxSupply: z.number().int().positive(),
  metadataUri: z.string().min(1),
  // For ERC-1155 the platform mints incrementing copies of the same tokenId;
  // for ERC-721 each purchase mints a new tokenId.
  tokenIdSeed: z.number().int().nonnegative().optional(),
});
export type NftNativeDeliveryConfig = z.infer<typeof NftNativeDeliveryConfig>;

export const StreamDeliveryConfig = z.object({
  playbackId: z.string().min(1),
  drm: z.boolean().default(false),
});
export type StreamDeliveryConfig = z.infer<typeof StreamDeliveryConfig>;

export const LicenseKeyDeliveryConfig = z.object({
  keyPoolId: z.string().min(1),
  activationEndpoint: z.string().url().optional(),
});
export type LicenseKeyDeliveryConfig = z.infer<typeof LicenseKeyDeliveryConfig>;

export const AiAssetDeliveryConfig = z.object({
  fileKey: z.string().min(1),
  usageScopes: z.array(z.string()).min(1),
});
export type AiAssetDeliveryConfig = z.infer<typeof AiAssetDeliveryConfig>;

export const BundleDeliveryConfig = z.object({
  childAssetIds: z.array(z.string()).min(1),
});
export type BundleDeliveryConfig = z.infer<typeof BundleDeliveryConfig>;

export const DELIVERY_CONFIG_SCHEMAS = {
  file: FileDeliveryConfig,
  nft_native: NftNativeDeliveryConfig,
  stream: StreamDeliveryConfig,
  license_key: LicenseKeyDeliveryConfig,
  ai_asset: AiAssetDeliveryConfig,
  bundle: BundleDeliveryConfig,
} as const;

export type DeliveryConfigByKind = {
  file: FileDeliveryConfig;
  nft_native: NftNativeDeliveryConfig;
  stream: StreamDeliveryConfig;
  license_key: LicenseKeyDeliveryConfig;
  ai_asset: AiAssetDeliveryConfig;
  bundle: BundleDeliveryConfig;
};

export function parseDeliveryConfig<K extends AssetKind>(
  kind: K,
  raw: string | object,
): DeliveryConfigByKind[K] {
  const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
  const schema = DELIVERY_CONFIG_SCHEMAS[kind];
  return schema.parse(parsed) as DeliveryConfigByKind[K];
}

export function encodeDeliveryConfig<K extends AssetKind>(
  kind: K,
  config: DeliveryConfigByKind[K],
): string {
  const schema = DELIVERY_CONFIG_SCHEMAS[kind];
  return JSON.stringify(schema.parse(config));
}

// Human-friendly labels and CTA copy per kind. v1.5 (nonprofit/free) ships
// only `file`. The on-chain + paid kinds are kept in the type so the
// dispatcher + DB stay forward-compatible for when they come back.
export const KIND_META: Record<
  AssetKind,
  { label: string; cta: string; shipped: boolean }
> = {
  file: { label: "File", cta: "Download free", shipped: true },
  nft_native: { label: "NFT", cta: "Coming back later", shipped: false },
  stream: { label: "Stream", cta: "Coming soon", shipped: false },
  license_key: { label: "License key", cta: "Coming soon", shipped: false },
  ai_asset: { label: "AI asset", cta: "Coming soon", shipped: false },
  bundle: { label: "Bundle", cta: "Coming soon", shipped: false },
};
