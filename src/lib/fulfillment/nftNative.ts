import { db } from "../db";
import { mintNativeNft } from "../relayer";
import { parseDeliveryConfig } from "@/types/delivery";
import type { FulfillmentHandler } from "./types";

// kind=nft_native: the asset itself is on-chain. Mint the actual NFT to the
// buyer (no separate receipt needed) and create an Entitlement that records
// which tokenId the buyer received.
export const nftNativeHandler: FulfillmentHandler = {
  kind: "nft_native",
  shipped: true,
  async handle({ order, asset, user, recipientAddress }) {
    const config = parseDeliveryConfig("nft_native", asset.deliveryConfig);

    const mint = await mintNativeNft({
      to: recipientAddress,
      contractAddress: config.contractAddress,
      tokenStandard: config.tokenStandard,
      tokenId:
        config.tokenStandard === "erc1155" && config.tokenIdSeed != null
          ? String(config.tokenIdSeed)
          : undefined,
      metadataUri: config.metadataUri,
    });

    await db.entitlement.create({
      data: {
        userId: user.id,
        assetId: asset.id,
        orderId: order.id,
        kind: "nft_native",
      },
    });

    return {
      fulfillmentTxHash: mint.txHash,
      receiptTokenId: mint.tokenId, // for nft_native this is the actual token id
      notes: `${mint.simulated ? "Simulated" : "On-chain"} ${config.tokenStandard.toUpperCase()} mint to ${recipientAddress}`,
    };
  },
};
