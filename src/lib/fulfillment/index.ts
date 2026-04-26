import { db } from "../db";
import { ASSET_KINDS, type AssetKind } from "@/types/delivery";
import { fileHandler } from "./file";
import { nftNativeHandler } from "./nftNative";
import { makeStubHandler } from "./stub";
import type { FulfillmentContext, FulfillmentHandler, FulfillmentResult } from "./types";

// The single source of truth for which kinds have shipping fulfillment.
const HANDLERS: Record<AssetKind, FulfillmentHandler> = {
  file: fileHandler,
  nft_native: nftNativeHandler,
  stream: makeStubHandler("stream"),
  license_key: makeStubHandler("license_key"),
  ai_asset: makeStubHandler("ai_asset"),
  bundle: makeStubHandler("bundle"),
};

export function getHandler(kind: string): FulfillmentHandler {
  if (!(ASSET_KINDS as readonly string[]).includes(kind)) {
    throw new Error(`Unknown asset kind: ${kind}`);
  }
  return HANDLERS[kind as AssetKind];
}

// dispatch() is called from /api/claim (free model) and - when payment rails
// come back - from the Stripe webhook + crypto checkout. Idempotent: re-running
// for an already-fulfilled order is a no-op.
export async function dispatch(orderId: string): Promise<FulfillmentResult | null> {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { asset: true, user: true },
  });
  if (!order) throw new Error(`Order not found: ${orderId}`);
  if (order.status === "fulfilled") return null;
  if (order.status !== "paid") {
    throw new Error(`Order ${orderId} is not in a fulfillable state (status=${order.status})`);
  }

  const handler = getHandler(order.asset.kind);
  if (!handler.shipped) {
    await db.order.update({
      where: { id: order.id },
      data: { status: "failed", errorMessage: `Kind "${order.asset.kind}" not yet shipped` },
    });
    throw new Error(`Asset kind "${order.asset.kind}" has no shipped handler`);
  }

  const recipientAddress =
    order.user.linkedWalletAddress ||
    order.user.custodialWalletAddress ||
    `custodial:${order.user.id}`; // demo placeholder; real custodial address is set at signup

  const ctx: FulfillmentContext = {
    order,
    asset: order.asset,
    user: order.user,
    recipientAddress,
  };

  try {
    const result = await handler.handle(ctx);
    await db.order.update({
      where: { id: order.id },
      data: {
        status: "fulfilled",
        fulfillmentTxHash: result.fulfillmentTxHash,
      },
    });
    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown fulfillment error";
    await db.order.update({
      where: { id: order.id },
      data: { status: "failed", errorMessage: message },
    });
    throw err;
  }
}

export { HANDLERS };
