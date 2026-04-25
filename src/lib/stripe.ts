import Stripe from "stripe";
import { env } from "./env";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe | null {
  if (!env.stripe.enabled) return null;
  if (_stripe) return _stripe;
  _stripe = new Stripe(env.stripe.secretKey, {
    apiVersion: "2025-02-24.acacia",
  });
  return _stripe;
}

export const stripeEnabled = env.stripe.enabled;
