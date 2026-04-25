import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { dispatch } from "@/lib/fulfillment";
import { env } from "@/lib/env";

const schema = z.object({
  assetId: z.string().min(1),
  recipientAddress: z.string().nullable().optional(),
});

// Crypto checkout endpoint. In production this is two-step:
//   1) Client sends the on-chain payment tx hash (USDC transfer to platform).
//   2) Server verifies the tx receipt against publicClient() before fulfilling.
// For this scaffold we accept the buyer's intent, link their wallet (if any)
// to the user record, and run the dispatcher with a SIMULATED tx hash if the
// chain isn't enabled. When CHAIN_ENABLED=true, replace with verifyPaymentTx().
export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const asset = await db.asset.findUnique({ where: { id: parsed.data.assetId } });
  if (!asset || asset.status !== "published") {
    return NextResponse.json({ error: "Asset not available" }, { status: 404 });
  }

  if (parsed.data.recipientAddress) {
    await db.user.update({
      where: { id: user.id },
      data: { linkedWalletAddress: parsed.data.recipientAddress },
    });
  }

  const order = await db.order.create({
    data: {
      userId: user.id,
      assetId: asset.id,
      paymentRail: "crypto",
      amountUsdCents: asset.priceUsdCents,
      status: env.chain.enabled ? "pending" : "paid",
      cryptoTxHash: env.chain.enabled
        ? null
        : `0xsimulated-${Date.now().toString(16)}`,
    },
  });

  if (!env.chain.enabled) {
    try {
      await dispatch(order.id);
    } catch (e) {
      // status set to "failed" in dispatch()
    }
    return NextResponse.json({ orderId: order.id, simulated: true });
  }

  // TODO when CHAIN_ENABLED=true:
  //   - Read body.txHash, validate USDC ERC-20 Transfer log to platform address
  //   - Update order.cryptoTxHash + status="paid"
  //   - Then call dispatch(order.id)
  return NextResponse.json({
    orderId: order.id,
    next: "submit-payment-tx",
    message: "Submit USDC payment then POST tx hash to /api/checkout/crypto/confirm",
  });
}
