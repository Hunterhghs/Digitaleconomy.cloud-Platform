import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

const schema = z.object({
  assetId: z.string().min(1),
  action: z.enum(["takedown", "restore"]),
  notes: z.string().optional(),
});

// DMCA workflow: marking an asset taken down (a) hides it from the storefront
// and (b) revokes all open entitlements so download URLs stop minting and the
// library row disappears. The on-chain receipt NFT is intentionally NOT
// burned — that's a separate, deliberate action because once minted it's
// portable.
export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const { assetId, action, notes } = parsed.data;
  const newStatus = action === "takedown" ? "takedown" : "published";

  await db.$transaction(async (tx) => {
    await tx.asset.update({ where: { id: assetId }, data: { status: newStatus } });
    if (action === "takedown") {
      await tx.entitlement.updateMany({
        where: { assetId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
    await tx.adminAction.create({
      data: {
        adminUserId: admin.id,
        type: action,
        targetId: assetId,
        notes,
      },
    });
  });

  return NextResponse.json({ ok: true });
}
