import { createHmac } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { env } from "./env";

// Storage abstraction. Local-fs in dev, S3/R2 in production.
// Returns a short-lived signed URL the buyer can hit to download the file.
//
// Local driver: signs a token bound to (fileKey, expiresAt) and serves the file
// from /api/storage/[fileKey] after verifying the signature.
//
// S3 driver: production hook — install @aws-sdk/client-s3 and
// @aws-sdk/s3-request-presigner, then return getSignedUrl(...).

const LOCAL_ROOT = join(process.cwd(), "storage", "local");

export type SignedUrl = {
  url: string;
  expiresAt: Date;
};

export function ensureLocalRoot(): void {
  if (!existsSync(LOCAL_ROOT)) {
    mkdirSync(LOCAL_ROOT, { recursive: true });
  }
}

export function getLocalPath(fileKey: string): string {
  return join(LOCAL_ROOT, fileKey);
}

export function localFileExists(fileKey: string): boolean {
  const p = getLocalPath(fileKey);
  return existsSync(p) && statSync(p).isFile();
}

export function readLocalFile(fileKey: string): Buffer {
  return readFileSync(getLocalPath(fileKey));
}

function sign(payload: string): string {
  return createHmac("sha256", env.authSecret).update(payload).digest("hex");
}

export function signLocalDownload(fileKey: string, ttlSeconds = 900): SignedUrl {
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
  const expiresAtMs = expiresAt.getTime();
  const sig = sign(`${fileKey}:${expiresAtMs}`);
  const params = new URLSearchParams({
    expires: String(expiresAtMs),
    sig,
  });
  return {
    url: `/api/storage/${encodeURIComponent(fileKey)}?${params.toString()}`,
    expiresAt,
  };
}

export function verifyLocalDownload(
  fileKey: string,
  expires: string | null,
  sig: string | null,
): boolean {
  if (!expires || !sig) return false;
  const expiresAtMs = Number(expires);
  if (!Number.isFinite(expiresAtMs) || expiresAtMs < Date.now()) return false;
  const expected = sign(`${fileKey}:${expiresAtMs}`);
  return expected === sig;
}

export async function createSignedDownloadUrl(
  fileKey: string,
  ttlSeconds = 900,
): Promise<SignedUrl> {
  if (env.storage.driver === "local") {
    return signLocalDownload(fileKey, ttlSeconds);
  }
  // Production hook: switch on env.storage.driver === "s3" and use the
  // AWS SDK presigner. Left as an explicit TODO so it's a single-file change.
  throw new Error(
    "S3 storage driver is not wired in this scaffold. Install @aws-sdk/client-s3 and @aws-sdk/s3-request-presigner and implement here.",
  );
}
