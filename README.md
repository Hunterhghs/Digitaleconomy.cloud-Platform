# Digitaleconomy.cloud

A polymorphic digital asset marketplace built to capitalize on the broader
digital economy. The architecture treats "asset" as a polymorphic concept
from day one, so the same storefront, checkout, account, and provenance
layer serve many kinds of digital assets:

- `file` — downloadable digital goods (images, audio, video, 3D, code, ebooks). **Shipped in v1.**
- `nft_native` — true on-chain NFTs where the token IS the asset. **Shipped in v1.**
- `stream` — gated streaming content. *Reserved for Phase 2.*
- `license_key` — software keys / activations. *Reserved for Phase 2.*
- `ai_asset` — prompts, fine-tuned models, datasets. *Reserved for Phase 4.*
- `bundle` — parent assets that fulfill multiple children. *Reserved for Phase 3.*

Every purchase produces an on-chain record. For NFTs the asset itself is the
token; for everything else, a `ReceiptNFT1155` is minted to the buyer's
wallet as portable proof of license. Buyers pay with a debit card via Stripe
or with a connected crypto wallet — they never have to touch crypto.

This is the v1 storefront-first scope from the project plan: browse / search,
asset detail, dual-rail checkout, polymorphic fulfillment dispatcher,
buyer library, and a minimal admin (takedown / refund / view orders).

## Quick start

```bash
cp .env.example .env
npm install
npm run db:push    # creates SQLite db at prisma/dev.db
npm run db:seed    # creates admin user + 9 sample assets (6 files, 3 NFTs)
npm run dev
```

Visit `http://localhost:3000`. Sign in with the admin credentials from `.env`
(`admin@example.com / admin1234` by default), or create a new account.

## What works out of the box (no external services required)

The platform is designed so the **full polymorphic flow runs locally with
zero external service credentials**, so you can see the architecture working
before you wire in Stripe / R2 / a real chain.

| Concern | Local default | Production swap |
| --- | --- | --- |
| DB | SQLite (`prisma/dev.db`) | Postgres — change `provider` in [prisma/schema.prisma](prisma/schema.prisma) and `DATABASE_URL` |
| Auth | Email + password (Credentials provider) | Email magic-link or SIWE — see [src/lib/auth.ts](src/lib/auth.ts) |
| File storage | Local filesystem (`storage/local/`) signed via HMAC | R2 / S3 with presigned URLs — see [src/lib/storage.ts](src/lib/storage.ts) |
| Stripe checkout | **Simulated** — orders auto-mark paid, dispatcher runs inline | Real Stripe Checkout when `STRIPE_SECRET_KEY` is set |
| Crypto checkout | **Simulated** payment + simulated mint | Real USDC payment + on-chain mint when `CHAIN_ENABLED=true` |
| On-chain mint | Stub relayer in [src/lib/relayer.ts](src/lib/relayer.ts) returns deterministic fake tx hashes | `writeContract` against deployed `ReceiptNFT1155` / `NativeAssetNFT1155` |

Every fallback is a single-file swap with a `TODO` marker so the path to
production is explicit.

## Architecture at a glance

```
Browser
  │
  ▼
Next.js (App Router)  ──►  Postgres / SQLite (Prisma)
  │
  ├── /api/checkout/stripe ──► Stripe Checkout ──► /api/webhooks/stripe ──┐
  │                                                                        ▼
  ├── /api/checkout/crypto ──► verifies USDC tx ───────────────────► dispatch(orderId)
  │                                                                        │
  │                                                                        ▼
  │                                                            Fulfillment Dispatcher
  │                                                                        │
  │                                       ┌────────────────┬───────────────┼────────────────┐
  │                                       ▼                ▼               ▼                ▼
  │                               file handler     nft_native handler   stream (stub)   license_key (stub)
  │                                       │                │
  │                                       ▼                ▼
  │                                signed URL +     mint to buyer's
  │                                receipt mint     wallet (the asset
  │                                (ReceiptNFT1155) is the token)
  │
  ▼
/library  ──► reads Entitlement rows (the universal "what does this user own" record)
```

## The polymorphic core

Three pieces make the platform extensible to any asset kind:

1. **Schema discriminator.** `Asset.kind` is a string column with a closed
   set of allowed values, and `Asset.deliveryConfig` is a JSON column whose
   shape is validated per-kind by Zod schemas in [src/types/delivery.ts](src/types/delivery.ts).
2. **Per-kind handlers.** Each kind has a `FulfillmentHandler` in
   [src/lib/fulfillment/](src/lib/fulfillment/) that knows how to fulfill an
   order of that kind (mint to a wallet, issue a download, generate a stream
   token, etc.).
3. **Single dispatcher entry point.** [src/lib/fulfillment/index.ts](src/lib/fulfillment/index.ts)
   exports `dispatch(orderId)`. Both checkout paths (Stripe and crypto) call
   this same function once payment is confirmed; idempotent re-runs are safe.

**To add a new asset kind:**

1. Add it to `ASSET_KINDS` in [src/types/delivery.ts](src/types/delivery.ts).
2. Define its Zod `DeliveryConfig` and `KIND_META` entry in the same file.
3. Create `src/lib/fulfillment/<kind>.ts` exporting a `FulfillmentHandler`.
4. Register it in `HANDLERS` inside [src/lib/fulfillment/index.ts](src/lib/fulfillment/index.ts).
5. Update the kind-specific UI in [src/app/assets/[slug]/page.tsx](src/app/assets/%5Bslug%5D/page.tsx)
   and [src/app/library/LibraryRowActions.tsx](src/app/library/LibraryRowActions.tsx).

That's it — checkout, orders, library, and admin all work for the new kind
automatically.

## Smart contracts

See [contracts/README.md](contracts/README.md) for deployment notes.

- [contracts/ReceiptNFT1155.sol](contracts/ReceiptNFT1155.sol) — receipts for off-chain kinds.
- [contracts/NativeAssetNFT1155.sol](contracts/NativeAssetNFT1155.sol) — actual NFTs for `kind="nft_native"`.

Both contracts include EIP-2981 royalty hooks for the Phase 3 secondary
market, and both are minter-gated so only the platform's relayer can mint.
The `.sol` files are reference implementations meant to be dropped into a
Foundry project for deployment.

## Project layout

```
src/
  app/                              # Next.js App Router
    page.tsx                        # home
    browse/page.tsx                 # browse + filter by kind/category
    assets/[slug]/page.tsx          # asset detail (kind-aware UI)
    library/page.tsx                # buyer library (reads Entitlement)
    checkout/success/page.tsx
    login/                          # email + password
    admin/                          # takedown + orders + refunds
    api/
      auth/[...nextauth]/route.ts   # Auth.js handler
      auth/register/route.ts
      checkout/stripe/route.ts      # creates Stripe session (or sim)
      checkout/crypto/route.ts      # confirms crypto payment (or sim)
      webhooks/stripe/route.ts      # Stripe webhook -> dispatcher
      download/[entitlementId]/...  # signed download URL issuer
      storage/[fileKey]/route.ts    # local-fs signed download server
      admin/takedown/route.ts
      admin/refund/route.ts

  components/                       # UI primitives
    Header.tsx, AssetCard.tsx, KindBadge.tsx, BuyPanel.tsx,
    Providers.tsx, LogoutButton.tsx

  lib/
    db.ts                           # Prisma client
    env.ts                          # typed env access with safe defaults
    auth.ts                         # NextAuth v5 config
    stripe.ts                       # Stripe SDK
    storage.ts                      # storage abstraction (local | s3)
    chain.ts                        # viem clients + explorer URLs
    relayer.ts                      # gas relayer (real or simulated)
    wagmi.ts                        # wagmi config
    fulfillment/
      types.ts
      file.ts                       # downloadable-file handler
      nftNative.ts                  # native-NFT handler
      stub.ts                       # placeholders for Phase 2+ kinds
      index.ts                      # registry + dispatch(orderId)

  types/
    delivery.ts                     # AssetKind union, per-kind Zod schemas, KIND_META

prisma/
  schema.prisma                     # User, Asset, Order, Entitlement, DownloadGrant, AdminAction
  seed.ts                           # admin user + 9 sample assets

contracts/
  ReceiptNFT1155.sol
  NativeAssetNFT1155.sol
  README.md                         # Foundry deployment instructions
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

See [.env.example](.env.example) for the full list. The most important
production toggles are:

- `DATABASE_URL` — Postgres connection string (also change provider in `schema.prisma`).
- `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` — when set, the simulated
  Stripe path is replaced with the real Stripe Checkout flow.
- `STORAGE_DRIVER=s3` + S3 credentials — switch from local-fs to R2/S3.
- `CHAIN_ENABLED=true` + `RELAYER_PRIVATE_KEY` + contract addresses — turn on
  real on-chain mints.

## What's intentionally not in v1

Per the plan ([the project overview](.cursor/plans/digital-asset-platform-overview_3ad73354.plan.md)):

- Creator self-serve onboarding, KYC, payouts (Phase 2).
- `stream`, `license_key`, `ai_asset`, `bundle` handlers (Phase 2+).
- Secondary market for NFTs / receipts + royalty splits (Phase 3).
- Reviews, ratings, social (Phase 2+).
- Subscription / bundle pricing (Phase 2+).

The polymorphic core is in place so each of these is a contained, additive
change rather than a rewrite.
