import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { db } from "@/lib/db";
import { getStripe } from "@/lib/stripe";
import { dispatch } from "@/lib/fulfillment";
import { env } from "@/lib/env";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const stripe = getStripe();
  if (!stripe || !env.stripe.webhookSecret) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  }

  const sig = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  const raw = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, env.stripe.webhookSecret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Invalid signature";
    return NextResponse.json({ error: `Webhook error: ${msg}` }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const orderId = session.metadata?.orderId;
    if (orderId) {
      await db.order.update({
        where: { id: orderId },
        data: { status: "paid" },
      });
      try {
        await dispatch(orderId);
      } catch (e) {
        // dispatch() already records failure in DB
        console.error("Fulfillment failed for order", orderId, e);
      }
    }
  }

  return NextResponse.json({ received: true });
}
