import { NextResponse } from "next/server";
import {
  ensureLocalRoot,
  localFileExists,
  readLocalFile,
  verifyLocalDownload,
} from "@/lib/storage";

// Serves files from the local-fs storage driver, gated by an HMAC-signed URL.
// Production swaps this out for an S3/R2 presigned URL that points directly at
// the bucket — this route is dev-only.
export async function GET(
  req: Request,
  { params }: { params: Promise<{ fileKey: string }> },
) {
  ensureLocalRoot();
  const { fileKey } = await params;
  const decoded = decodeURIComponent(fileKey);
  const url = new URL(req.url);
  const ok = verifyLocalDownload(
    decoded,
    url.searchParams.get("expires"),
    url.searchParams.get("sig"),
  );
  if (!ok) return new NextResponse("Forbidden", { status: 403 });
  if (!localFileExists(decoded)) {
    return new NextResponse("Not found", { status: 404 });
  }
  const buf = readLocalFile(decoded);
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${decoded}"`,
    },
  });
}
