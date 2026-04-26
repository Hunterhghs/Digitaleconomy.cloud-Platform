import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { dispatch } from "@/lib/fulfillment";
import { createSignedDownloadUrl } from "@/lib/storage";
import { parseDeliveryConfig } from "@/types/delivery";

const Body = z.object({ assetId: z.string().min(1) });

// Anyone can hit /api/claim. If signed in we record an Order + Entitlement
// (so the asset shows up in their Library + the creator sees the download).
// Anonymous claims just return a signed URL straight to the file.
export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const asset = await db.asset.findUnique({ where: { id: parsed.data.assetId } });
  if (!asset || asset.status !== "published") {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }
  if (asset.kind !== "file") {
    return NextResponse.json(
      { error: `${asset.kind} assets are not downloadable yet` },
      { status: 400 },
    );
  }

  let cfg;
  try {
    cfg = parseDeliveryConfig("file", asset.deliveryConfig);
  } catch {
    return NextResponse.json({ error: "Asset is missing a download" }, { status: 500 });
  }

  const session = await auth();
  const user = session?.user as { id?: string } | undefined;

  if (user?.id) {
    // De-dupe: if the user already has an entitlement, reuse it so the
    // Library doesn't fill up with one row per re-download.
    const existing = await db.entitlement.findFirst({
      where: { userId: user.id, assetId: asset.id, revokedAt: null },
    });

    if (!existing) {
      const order = await db.order.create({
        data: {
          userId: user.id,
          assetId: asset.id,
          paymentRail: "free",
          amountUsdCents: 0,
          status: "paid",
        },
      });
      try {
        await dispatch(order.id);
      } catch (err) {
        return NextResponse.json(
          { error: err instanceof Error ? err.message : "Fulfillment failed" },
          { status: 500 },
        );
      }
    }
  }

  await db.asset.update({
    where: { id: asset.id },
    data: { downloadCount: { increment: 1 } },
  });

  const signed = await createSignedDownloadUrl(cfg.fileKey, 900);
  return NextResponse.json({ url: signed.url, expiresAt: signed.expiresAt });
}
