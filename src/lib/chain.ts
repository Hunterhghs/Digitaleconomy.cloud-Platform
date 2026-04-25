import { createPublicClient, http, type Address } from "viem";
import { base, baseSepolia } from "viem/chains";
import { env } from "./env";

export const activeChain = env.chain.name === "base" ? base : baseSepolia;

export function publicClient() {
  return createPublicClient({
    chain: activeChain,
    transport: http(env.chain.rpcUrl || undefined),
  });
}

export function explorerTxUrl(txHash: string): string {
  const base = activeChain.blockExplorers?.default?.url ?? "";
  return base ? `${base}/tx/${txHash}` : `#`;
}

export function explorerAddressUrl(address: Address | string): string {
  const base = activeChain.blockExplorers?.default?.url ?? "";
  return base ? `${base}/address/${address}` : `#`;
}

export const CHAIN_ID = activeChain.id;
export const CHAIN_LABEL = activeChain.name;
