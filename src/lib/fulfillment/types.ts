import type { Asset, Order, User } from "@prisma/client";
import type { AssetKind } from "@/types/delivery";

export type FulfillmentContext = {
  order: Order;
  asset: Asset;
  user: User;
  // Wallet to deliver to. For nft_native this MUST be a wallet the buyer
  // controls (or their custodial wallet). For receipt mints, custodial is fine.
  recipientAddress: string;
};

export type FulfillmentResult = {
  fulfillmentTxHash: string | null;
  receiptTokenId: string | null;
  notes?: string;
};

export type FulfillmentHandler = {
  kind: AssetKind;
  shipped: boolean; // false = stub for a future kind (Phase 2+)
  handle(ctx: FulfillmentContext): Promise<FulfillmentResult>;
};
