import { db } from "../db";
import { env } from "../env";
import { mintReceipt } from "../relayer";
import { parseDeliveryConfig } from "@/types/delivery";
import type { FulfillmentHandler } from "./types";

// kind=file: create an Entitlement + DownloadGrant. In the paid/on-chain
// model this also mints a ReceiptNFT; in the nonprofit/free model
// (CHAIN_ENABLED=false) the mint is skipped entirely.
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
            expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365),
            maxDownloads: 9999,
          },
        },
      },
    });

    if (!env.chain.enabled) {
      return {
        fulfillmentTxHash: null,
        receiptTokenId: null,
        notes: `Granted entitlement ${entitlement.id} (free download, no on-chain receipt)`,
      };
    }

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
      notes: `Granted entitlement ${entitlement.id}; on-chain receipt minted`,
    };
  },
};
