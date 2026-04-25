import { db } from "../db";
import { mintReceipt } from "../relayer";
import { parseDeliveryConfig } from "@/types/delivery";
import type { FulfillmentHandler } from "./types";

// kind=file: create an Entitlement + DownloadGrant, then mint a ReceiptNFT
// in the background so the buyer has portable proof of purchase.
export const fileHandler: FulfillmentHandler = {
  kind: "file",
  shipped: true,
  async handle({ order, asset, user, recipientAddress }) {
    parseDeliveryConfig("file", asset.deliveryConfig); // validate shape early

    const entitlement = await db.entitlement.create({
      data: {
        userId: user.id,
        assetId: asset.id,
        orderId: order.id,
        kind: "file",
        downloadGrant: {
          create: {
            expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365), // 1y
            maxDownloads: 50,
          },
        },
      },
    });

    const mint = await mintReceipt({
      to: recipientAddress,
      assetId: asset.id,
      receiptTokenId: asset.receiptTokenId,
    });

    if (!asset.receiptTokenId) {
      await db.asset.update({
        where: { id: asset.id },
        data: { receiptTokenId: mint.tokenId },
      });
    }

    return {
      fulfillmentTxHash: mint.txHash,
      receiptTokenId: mint.tokenId,
      notes: `Granted entitlement ${entitlement.id}; ${mint.simulated ? "simulated" : "on-chain"} receipt mint`,
    };
  },
};
