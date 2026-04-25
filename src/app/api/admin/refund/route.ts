import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { getStripe } from "@/lib/stripe";

const schema = z.object({
  orderId: z.string().min(1),
  reason: z.string().optional(),
});

// Refund flow: try to issue a Stripe refund (when applicable + configured),
// then mark the order refunded and revoke the buyer's entitlement.
// On-chain receipts are NOT burned (they're already in the buyer's wallet);
// the entitlement revocation is what stops further downloads / access.
export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const order = await db.order.findUnique({ where: { id: parsed.data.orderId } });
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if (order.status === "refunded") {
    return NextResponse.json({ error: "Already refunded" }, { status: 400 });
  }

  let stripeRefundId: string | null = null;
  if (order.paymentRail === "stripe" && order.stripeSessionId) {
    const stripe = getStripe();
    if (stripe) {
      const session = await stripe.checkout.sessions.retrieve(order.stripeSessionId);
      if (session.payment_intent) {
        const refund = await stripe.refunds.create({
          payment_intent: session.payment_intent.toString(),
        });
        stripeRefundId = refund.id;
      }
    }
  }

  await db.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: order.id },
      data: { status: "refunded", errorMessage: parsed.data.reason ?? null },
    });
    await tx.entitlement.updateMany({
      where: { orderId: order.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await tx.adminAction.create({
      data: {
        adminUserId: admin.id,
        type: "refund",
        targetId: order.id,
        notes: parsed.data.reason
          ? `${parsed.data.reason}${stripeRefundId ? ` | stripe:${stripeRefundId}` : ""}`
          : stripeRefundId
            ? `stripe:${stripeRefundId}`
            : null,
      },
    });
  });

  return NextResponse.json({ ok: true, stripeRefundId });
}
