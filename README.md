# Digitaleconomy.cloud

A nonprofit, free library of digital assets. Anyone can browse and download.
Sign up to share your own work, and your assets are available for free
forever (that's the goal anyway).

This is **v1.5 of the platform: free + nonprofit**. Payment processing
(Stripe + crypto) and on-chain receipt minting are turned off and the code
paths are dormant — the polymorphic core (DB schema, fulfillment dispatcher,
per-kind handlers, on-chain layer, smart contracts) is intact so paid kinds,
NFT minting, streaming, license keys, etc. can be re-enabled later without
a rewrite.

| Capability | v1.5 (now) | Reserved for later |
| --- | --- | --- |
| Browse + search the library | ✓ | |
| Anonymous downloads (no account) | ✓ | |
| Signed-in users get a saved Library | ✓ | |
| User-uploaded assets (auto-publish, admin take-down) | ✓ | |
| Creator dashboard (your uploads + total downloads) | ✓ | |
| Admin moderation | ✓ | |
| Asset kinds | `file` | `nft_native`, `stream`, `license_key`, `ai_asset`, `bundle` |
| Payments | _none — everything is free_ | Stripe + USDC on Base (code dormant) |
| On-chain receipts | _disabled_ | Mint a `ReceiptNFT1155` per claim when `CHAIN_ENABLED=true` |

## Quick start

```bash
cp .env.example .env
npm install
npm run db:push    # creates SQLite db at prisma/dev.db
npm run db:seed    # admin user + 6 free sample assets
npm run dev
```

Visit `http://localhost:3000`.

- **Anyone** can browse and download for free — no signup needed.
- **Sign in** with the demo admin (`admin@example.com / admin1234`) or create
  a new account, then visit `/upload` to share your own asset.
- **Library** at `/library` is your saved-downloads list (signed in only).
- **Admin** at `/admin` shows uploads, total downloads, and a takedown
  workflow for the moderation queue.

## What works out of the box (no external services required)

The platform is designed so the **full flow runs locally with zero external
service credentials**.

| Concern | Local default | Production swap |
| --- | --- | --- |
| DB | SQLite (`prisma/dev.db`) | Postgres — change `provider` in [prisma/schema.prisma](prisma/schema.prisma) and `DATABASE_URL` |
| Auth | Email + password (Credentials provider) | Email magic-link or SIWE — see [src/lib/auth.ts](src/lib/auth.ts) |
| File storage | Local filesystem (`storage/local/`) signed via HMAC | R2 / S3 with presigned URLs — see [src/lib/storage.ts](src/lib/storage.ts) |
| Uploads | Multipart → local FS | Same flow, swap storage driver to S3/R2 |
| On-chain mint (dormant) | No-op when `CHAIN_ENABLED=false` (default) | `writeContract` against deployed `ReceiptNFT1155` when `CHAIN_ENABLED=true` |

## Architecture at a glance

```
Browser
  │
  ▼
Next.js (App Router)  ──►  Postgres / SQLite (Prisma)
  │
  ├── /api/claim ──► (anon)  → signed download URL
  │                  (auth)  → Order(paymentRail=free, status=paid)
  │                            → dispatch(orderId)
  │                                │
  │                                ▼
  │                       Fulfillment Dispatcher
  │                                │
  │             ┌──────────────────┼──────────────────┐
  │             ▼                  ▼                  ▼
  │      file handler       nft_native (off)    stream (stub) ...
  │             │
  │             ▼
  │      create Entitlement + DownloadGrant
  │      (skip on-chain mint when CHAIN_ENABLED=false)
  │
  ├── /api/upload ──► validates + writes to storage + creates Asset row
  │                   (status=published immediately, post-moderation)
  │
  ├── /api/download/[entitlementId] ──► fresh signed URL for owned asset
  │
  └── /api/storage/[fileKey] ──► serves local-fs file (HMAC-gated)
```

## The polymorphic core (still here, dormant)

Three pieces make the platform extensible to any asset kind:

1. **Schema discriminator.** `Asset.kind` is a string column with a closed
   set of allowed values, and `Asset.deliveryConfig` is a JSON column whose
   shape is validated per-kind by Zod schemas in
   [src/types/delivery.ts](src/types/delivery.ts).
2. **Per-kind handlers.** Each kind has a `FulfillmentHandler` in
   [src/lib/fulfillment/](src/lib/fulfillment/) that knows how to fulfill an
   order of that kind.
3. **Single dispatcher entry point.**
   [src/lib/fulfillment/index.ts](src/lib/fulfillment/index.ts) exports
   `dispatch(orderId)`. v1.5 calls it from `/api/claim` for signed-in
   downloads. When payment rails return, Stripe webhooks + crypto checkout
   will call the same function.

**To add a new asset kind:**

1. Add it to `ASSET_KINDS` in [src/types/delivery.ts](src/types/delivery.ts).
2. Define its Zod `DeliveryConfig` and `KIND_META` entry in the same file.
3. Create `src/lib/fulfillment/<kind>.ts` exporting a `FulfillmentHandler`.
4. Register it in `HANDLERS` inside
   [src/lib/fulfillment/index.ts](src/lib/fulfillment/index.ts).
5. Update the kind-specific UI in
   [src/app/assets/[slug]/page.tsx](src/app/assets/%5Bslug%5D/page.tsx)
   and [src/app/library/LibraryRowActions.tsx](src/app/library/LibraryRowActions.tsx).

## Bringing payments + on-chain back later

When the platform decides to add paid kinds or restore on-chain provenance:

- **On-chain receipts**: set `CHAIN_ENABLED=true`, deploy
  [contracts/ReceiptNFT1155.sol](contracts/ReceiptNFT1155.sol), and provide
  `RELAYER_PRIVATE_KEY` + `RECEIPT_CONTRACT_ADDRESS` in `.env`. The file
  fulfillment handler already routes through `mintReceipt()` when chain is
  enabled.
- **Stripe / crypto payments**: re-add the deps (`stripe`, `wagmi`, `viem`,
  `@rainbow-me/rainbowkit`, `@tanstack/react-query`) and the deleted
  payment routes (`/api/checkout/*`, `/api/webhooks/stripe`) — git history
  has them. The `Order` model already supports `paymentRail`, `amountUsdCents`,
  `stripeSessionId`, and `cryptoTxHash`.
- **NFT kind**: flip `KIND_META.nft_native.shipped` back to `true` in
  [src/types/delivery.ts](src/types/delivery.ts) and allow `nft_native` in
  the upload form.

## Smart contracts

See [contracts/README.md](contracts/README.md) for deployment notes. The
contracts are ready when the platform decides to re-enable on-chain
provenance:

- [contracts/ReceiptNFT1155.sol](contracts/ReceiptNFT1155.sol) — receipts for off-chain kinds.
- [contracts/NativeAssetNFT1155.sol](contracts/NativeAssetNFT1155.sol) — actual NFTs for `kind="nft_native"`.

## Project layout

```
src/
  app/                              # Next.js App Router
    page.tsx                        # home (nonprofit pitch + featured)
    browse/page.tsx                 # browse + search + category filter
    assets/[slug]/page.tsx          # asset detail + DownloadPanel
    upload/                         # creator upload form
    my/uploads/page.tsx             # creator dashboard
    library/                        # saved-downloads list (auth)
    admin/                          # moderation + activity
    login/                          # email + password
    api/
      auth/[...nextauth]/route.ts   # Auth.js handler
      auth/register/route.ts
      claim/route.ts                # anon + auth download endpoint
      upload/route.ts               # multipart upload
      download/[entitlementId]/...  # re-download signed URL
      storage/[fileKey]/route.ts    # local-fs signed download server
      admin/takedown/route.ts

  components/                       # UI primitives
    Header.tsx, AssetCard.tsx, KindBadge.tsx, DownloadPanel.tsx,
    Providers.tsx, LogoutButton.tsx

  lib/
    db.ts                           # Prisma client
    env.ts                          # typed env access with safe defaults
    auth.ts                         # NextAuth v5 config + requireUser/Admin
    storage.ts                      # storage abstraction (local | s3)
    chain.ts                        # viem clients (dormant)
    relayer.ts                      # mintReceipt/mintNativeNft (dormant)
    fulfillment/
      types.ts
      file.ts                       # downloadable-file handler
      nftNative.ts                  # native-NFT handler (dormant)
      stub.ts                       # placeholders for unshipped kinds
      index.ts                      # registry + dispatch(orderId)

  types/
    delivery.ts                     # AssetKind union, per-kind Zod schemas, KIND_META

prisma/
  schema.prisma                     # User, Asset, Order, Entitlement, DownloadGrant, AdminAction
  seed.ts                           # admin user + 6 free sample assets

contracts/
  ReceiptNFT1155.sol
  NativeAssetNFT1155.sol
  README.md
```

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the dev server on `:3000` |
| `npm run build` | Production build |
| `npm run start` | Run the production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run db:push` | Apply `schema.prisma` to the database |
| `npm run db:seed` | Seed the admin user + sample assets |
| `npm run db:reset` | Drop, recreate, and re-seed the DB (destructive) |
| `npm run db:studio` | Open Prisma Studio |

## Environment variables

See [.env.example](.env.example) for the full list. v1.5 needs nothing
beyond defaults. The most important production toggles are:

- `DATABASE_URL` — Postgres connection string (also change provider in `schema.prisma`).
- `STORAGE_DRIVER=s3` + S3 credentials — switch from local-fs to R2/S3.
- `UPLOAD_MAX_BYTES` — per-file upload size limit (default 50 MB).
- `CHAIN_ENABLED=true` — wakes the dormant on-chain receipt layer.

## What's intentionally not in v1.5

- Payment processing (Stripe + crypto) — code is removed; can be restored from git history.
- `nft_native`, `stream`, `license_key`, `ai_asset`, `bundle` kinds — handler/UI dormant.
- Reviews, ratings, comments, follow/social — none of it.
- Per-creator tipping / donations — the nonprofit framing on purpose.
- Pre-moderation review queue — uploads auto-publish; admin takes down reactively.

The polymorphic core is in place so each of these is a contained, additive
change rather than a rewrite.
