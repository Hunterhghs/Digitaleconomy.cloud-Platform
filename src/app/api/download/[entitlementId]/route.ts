import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { createSignedDownloadUrl } from "@/lib/storage";
import { parseDeliveryConfig } from "@/types/delivery";

// Issues a fresh short-lived signed download URL for an entitlement the
// caller actually owns. Increments the download counter and rejects if the
// grant has expired or hit its cap.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ entitlementId: string }> },
) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { entitlementId } = await params;
  const entitlement = await db.entitlement.findUnique({
    where: { id: entitlementId },
    include: { asset: true, downloadGrant: true },
  });
  if (!entitlement || entitlement.userId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (entitlement.revokedAt) {
    return NextResponse.json({ error: "Entitlement revoked" }, { status: 410 });
  }
  if (entitlement.kind !== "file" || !entitlement.downloadGrant) {
    return NextResponse.json({ error: "Not a downloadable asset" }, { status: 400 });
  }

  const grant = entitlement.downloadGrant;
  if (grant.expiresAt < new Date()) {
    return NextResponse.json({ error: "Grant expired" }, { status: 410 });
  }
  if (grant.downloadCount >= grant.maxDownloads) {
    return NextResponse.json({ error: "Download limit reached" }, { status: 429 });
  }

  const cfg = parseDeliveryConfig("file", entitlement.asset.deliveryConfig);
  const signed = await createSignedDownloadUrl(cfg.fileKey, 900);

  await db.downloadGrant.update({
    where: { id: grant.id },
    data: { downloadCount: { increment: 1 } },
  });

  return NextResponse.json({ url: signed.url, expiresAt: signed.expiresAt });
}
