import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getStripe, stripeEnabled } from "@/lib/stripe";
import { dispatch } from "@/lib/fulfillment";
import { env } from "@/lib/env";

const schema = z.object({ assetId: z.string().min(1) });

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

  const order = await db.order.create({
    data: {
      userId: user.id,
      assetId: asset.id,
      paymentRail: "stripe",
      amountUsdCents: asset.priceUsdCents,
      status: "pending",
    },
  });

  // SIMULATED Stripe path: when STRIPE_SECRET_KEY is unset (local demos),
  // mark the order as paid and run the dispatcher immediately so the user
  // can see the full polymorphic flow without a real Stripe account.
  if (!stripeEnabled) {
    await db.order.update({ where: { id: order.id }, data: { status: "paid" } });
    try {
      await dispatch(order.id);
    } catch (e) {
      // status already updated to "failed" inside dispatch()
    }
    return NextResponse.json({
      url: `${env.appUrl}/checkout/success?orderId=${order.id}&simulated=1`,
    });
  }

  const stripe = getStripe()!;
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: asset.priceUsdCents,
          product_data: {
            name: asset.title,
            description: asset.description.slice(0, 240),
          },
        },
      },
    ],
    metadata: { orderId: order.id, assetId: asset.id, userId: user.id },
    success_url: `${env.appUrl}/checkout/success?orderId=${order.id}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${env.appUrl}/assets/${asset.slug}?canceled=1`,
  });

  await db.order.update({
    where: { id: order.id },
    data: { stripeSessionId: session.id },
  });

  return NextResponse.json({ url: session.url });
}
