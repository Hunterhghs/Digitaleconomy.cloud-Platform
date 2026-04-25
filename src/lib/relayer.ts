import { createHash, randomBytes } from "node:crypto";
import { env } from "./env";

// The relayer is the single place we touch the chain on behalf of the user.
// In production: holds a hot key (or talks to Privy/Biconomy), signs and
// broadcasts mints, and waits for inclusion.
// In dev (CHAIN_ENABLED=false): SIMULATES mints by returning a deterministic
// fake tx hash + tokenId so the rest of the app can be exercised end-to-end.

export type MintInput = {
  to: string; // recipient address (custodial or buyer wallet)
  contractAddress: string;
  tokenStandard: "erc721" | "erc1155";
  // For ERC-1155 the dispatcher passes the asset's tokenIdSeed; for ERC-721
  // pass undefined and let the relayer report the new tokenId.
  tokenId?: string;
  amount?: number; // ERC-1155 quantity, default 1
  metadataUri?: string; // tokenURI override (used at first mint of a tokenId)
};

export type MintResult = {
  txHash: string;
  tokenId: string;
  simulated: boolean;
};

function fakeHash(input: string): string {
  const h = createHash("sha256").update(input).digest("hex");
  return `0x${h.slice(0, 64)}`;
}

function fakeTokenId(seed: string): string {
  // Map the seed to a deterministic 18-digit decimal id.
  const h = createHash("sha256").update(seed).digest("hex");
  return BigInt("0x" + h.slice(0, 12)).toString();
}

export async function mintReceipt(input: {
  to: string;
  assetId: string;
  receiptTokenId: string | null;
}): Promise<MintResult> {
  if (!env.chain.enabled) {
    const seed = `receipt:${input.assetId}:${input.to}:${randomBytes(8).toString("hex")}`;
    return {
      txHash: fakeHash(seed),
      tokenId: input.receiptTokenId ?? fakeTokenId(`receipt-id:${input.assetId}`),
      simulated: true,
    };
  }
  // Production hook: deploy ReceiptNFT1155, then call:
  //   walletClient.writeContract({ address: env.chain.receiptContractAddress, abi, functionName: 'mintTo', args: [...] })
  // and wait for the receipt with publicClient().waitForTransactionReceipt({ hash }).
  throw new Error(
    "On-chain receipt minting not configured. Set CHAIN_ENABLED=true and deploy ReceiptNFT1155 to use the live path.",
  );
}

export async function mintNativeNft(input: MintInput): Promise<MintResult> {
  if (!env.chain.enabled) {
    const seed = `native:${input.contractAddress}:${input.to}:${randomBytes(8).toString("hex")}`;
    const tokenId =
      input.tokenStandard === "erc1155"
        ? input.tokenId ?? fakeTokenId(`native-1155:${input.contractAddress}`)
        : fakeTokenId(seed); // ERC-721 -> new tokenId per mint
    return { txHash: fakeHash(seed), tokenId, simulated: true };
  }
  throw new Error(
    "On-chain native NFT minting not configured. Set CHAIN_ENABLED=true and deploy NativeAssetNFT contracts to use the live path.",
  );
}
