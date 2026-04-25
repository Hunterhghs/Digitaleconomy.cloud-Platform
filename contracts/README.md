# Contracts

Two contracts back the on-chain layer of the platform.

| Contract | Used for | Standard |
| --- | --- | --- |
| `ReceiptNFT1155` | Proof-of-purchase receipts for off-chain asset kinds (`file`, `stream`, `license_key`, `ai_asset`). One tokenId per Asset; minted to the buyer on every sale. | ERC-1155 + EIP-2981 |
| `NativeAssetNFT1155` | The actual asset for `kind="nft_native"`. Per-tokenId supply caps enforced on-chain. | ERC-1155 + EIP-2981 |

Both expose a `mintTo(...)` function callable only by the configured `minter`
address — the platform's relayer key.

## Deploying (Foundry)

This repo doesn't include a Foundry config; the `.sol` files are reference
implementations meant to be dropped into a `forge init`'d project. Suggested
flow:

```bash
forge init dap-contracts
cp -r ../contracts/*.sol dap-contracts/src/
cd dap-contracts
forge install OpenZeppelin/openzeppelin-contracts
forge build
forge create src/ReceiptNFT1155.sol:ReceiptNFT1155 \
  --rpc-url $CHAIN_RPC_URL \
  --private-key $DEPLOYER_PRIVATE_KEY \
  --constructor-args $RELAYER_ADDRESS $ROYALTY_RECEIVER 500
```

Repeat for `NativeAssetNFT1155`. Then write the deployed addresses into the
backend's `.env`:

```bash
RECEIPT_CONTRACT_ADDRESS=0x...
NATIVE_NFT_CONTRACT_ADDRESS=0x...
CHAIN_ENABLED=true
RELAYER_PRIVATE_KEY=0x...
CHAIN_RPC_URL=https://mainnet.base.org   # or sepolia
```

Restart the app; `src/lib/relayer.ts` will switch from the simulated path to
real `writeContract` calls (you need to fill in those calls — the scaffold
intentionally leaves them as a `throw new Error(...)` so the swap is
explicit).

## Why two contracts and not one

Receipts and native NFTs have different lifecycles:

- Receipts can be minted at any cadence; `tokenId` is fixed per Asset; supply
  is unbounded.
- Native NFTs need supply caps and per-token configuration (URI, edition
  count) before mints can happen.

Cramming both into one contract leaks safety properties (e.g., a bug in the
native-mint path could affect receipts and vice versa). Keeping them separate
also makes future per-collection ERC-721 drops a simple addition: deploy a
new contract, register its address against the Asset row.
