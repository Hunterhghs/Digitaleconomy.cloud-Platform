import Link from "next/link";
import { db } from "@/lib/db";
import { AssetCard } from "@/components/AssetCard";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [featured, totalAssets] = await Promise.all([
    db.asset.findMany({
      where: { status: "published" },
      orderBy: [{ downloadCount: "desc" }, { createdAt: "desc" }],
      take: 8,
    }),
    db.asset.count({ where: { status: "published" } }),
  ]);
  const uploadsOn = env.uploads.enabled;

  return (
    <div className="space-y-12">
      <section className="space-y-6">
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-widest text-emerald-300">
            Free for everyone &middot; Open to anyone
          </p>
          <h1 className="text-4xl font-semibold leading-tight md:text-5xl">
            A nonprofit home for digital assets.
          </h1>
          <p className="max-w-2xl text-white/60">
            {env.platform.name} is a free library of digital things people make -
            templates, art, audio loops, code, ebooks, 3D models. Anyone can
            download. {uploadsOn && "Sign up and you can share your own work too. "}
            No paywalls, no upsells, no crypto wallet required.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link href="/browse" className="btn-primary">Browse the library</Link>
            {uploadsOn && (
              <Link href="/login?next=/upload" className="btn-secondary">Share something</Link>
            )}
          </div>
          <p className="pt-1 text-xs text-white/40">
            {totalAssets.toLocaleString()} {totalAssets === 1 ? "asset" : "assets"} available - all free.
            {!uploadsOn && " Creator uploads coming soon."}
          </p>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-end justify-between">
          <h2 className="text-xl font-semibold">Most downloaded</h2>
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
          title="Free, no account needed"
          body="Anyone can download anything in the library. Sign in only if you want to publish or build a saved collection."
        />
        <Pillar
          title="Anyone can share"
          body="Create an account, upload a file, give it a title and a license. That's it - your asset is live."
        />
        <Pillar
          title="Built to grow"
          body="Today: free downloads. Soon: streaming, NFT-backed provenance for creators, more asset kinds. Same library."
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
      <p>The library is empty right now.</p>
      <p className="mt-2">
        <Link href="/login?next=/upload" className="text-emerald-300 hover:underline">
          Sign in and be the first to share something
        </Link>
        .
      </p>
    </div>
  );
}
