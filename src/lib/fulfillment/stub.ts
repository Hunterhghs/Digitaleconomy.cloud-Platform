import type { FulfillmentHandler } from "./types";
import type { AssetKind } from "@/types/delivery";

// Placeholder handlers for asset kinds reserved for Phase 2+. They throw a
// clear, structured error so the dispatcher can mark the order failed instead
// of silently succeeding.
export function makeStubHandler(kind: AssetKind): FulfillmentHandler {
  return {
    kind,
    shipped: false,
    async handle() {
      throw new Error(
        `Asset kind "${kind}" is reserved for a future phase. Add a handler in src/lib/fulfillment/${kind}.ts and register it in src/lib/fulfillment/index.ts.`,
      );
    },
  };
}
