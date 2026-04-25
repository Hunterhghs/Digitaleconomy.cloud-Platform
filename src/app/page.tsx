import Link from "next/link";
import { db } from "@/lib/db";
import { AssetCard } from "@/components/AssetCard";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const featured = await db.asset.findMany({
    where: { status: "published" },
    orderBy: { createdAt: "desc" },
    take: 8,
  });

  return (
    <div className="space-y-12">
      <section className="space-y-6">
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-widest text-accent-glow">
            Polymorphic asset model
          </p>
          <h1 className="text-4xl font-semibold leading-tight md:text-5xl">
            One platform for every kind of digital asset.
          </h1>
          <p className="max-w-2xl text-white/60">
            {env.platform.name} sells downloadable files, true on-chain NFTs, and
            (soon) streaming content, license keys, and AI assets - all from the
            same storefront. Pay with a debit card or your crypto wallet.
          </p>
          <div className="flex gap-3 pt-2">
            <Link href="/browse" className="btn-primary">Browse the catalog</Link>
            <Link href="/browse?kind=nft_native" className="btn-secondary">See the NFTs</Link>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-end justify-between">
          <h2 className="text-xl font-semibold">Featured</h2>
          <Link href="/browse" className="text-sm text-white/60 hover:text-white">
            See all →
          </Link>
        </div>
        {featured.length === 0 ? (
          <EmptyCatalog />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {featured.map((a) => (
              <AssetCard key={a.id} asset={a} />
            ))}
          </div>
        )}
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Pillar
          title="One catalog, many kinds"
          body="Files, NFTs, streams, license keys - same checkout, same library, same provenance layer."
        />
        <Pillar
          title="Dual-rail checkout"
          body="Pay with Stripe (debit/credit) or with USDC on Base. Buyers never have to touch crypto."
        />
        <Pillar
          title="On-chain provenance"
          body="Every purchase produces an on-chain record. For NFTs, the asset itself is the token; for files, a receipt NFT proves the license."
        />
      </section>
    </div>
  );
}

function Pillar({ title, body }: { title: string; body: string }) {
  return (
    <div className="card p-5">
      <div className="mb-1 font-medium">{title}</div>
      <div className="text-sm text-white/60">{body}</div>
    </div>
  );
}

function EmptyCatalog() {
  return (
    <div className="card p-8 text-center text-sm text-white/60">
      <p>No assets yet. Run the seed script:</p>
      <pre className="mt-3 inline-block rounded bg-white/5 px-3 py-2 text-xs">
        npm run db:seed
      </pre>
    </div>
  );
}
