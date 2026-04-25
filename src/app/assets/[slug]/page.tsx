import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { formatUsd } from "@/lib/format";
import { KindBadge } from "@/components/KindBadge";
import { BuyPanel } from "@/components/BuyPanel";
import {
  parseDeliveryConfig,
  KIND_META,
  type AssetKind,
} from "@/types/delivery";

export const dynamic = "force-dynamic";

export default async function AssetDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const asset = await db.asset.findUnique({ where: { slug } });
  if (!asset || asset.status !== "published") return notFound();

  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  const alreadyOwns = userId
    ? Boolean(
        await db.entitlement.findFirst({
          where: { userId, assetId: asset.id, revokedAt: null },
        }),
      )
    : false;

  const meta = KIND_META[asset.kind as AssetKind] ?? KIND_META.file;
  const tags = asset.tagsCsv ? asset.tagsCsv.split(",").map((t) => t.trim()) : [];

  let configSummary: string | null = null;
  try {
    if (asset.kind === "file") {
      const cfg = parseDeliveryConfig("file", asset.deliveryConfig);
      configSummary = `${cfg.mimeType} - ${(cfg.fileSizeBytes / 1024).toFixed(0)} KB`;
    } else if (asset.kind === "nft_native") {
      const cfg = parseDeliveryConfig("nft_native", asset.deliveryConfig);
      configSummary = `${cfg.tokenStandard.toUpperCase()} - max supply ${cfg.maxSupply}`;
    }
  } catch {
    configSummary = null;
  }

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.4fr_1fr]">
      <div className="space-y-6">
        <div className="aspect-[4/3] overflow-hidden rounded-xl border border-white/5 bg-gradient-to-br from-accent/30 to-purple-500/20">
          {asset.previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={asset.previewUrl} alt={asset.title} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-7xl text-white/20">
              {asset.title.slice(0, 1)}
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <KindBadge kind={asset.kind} />
            <span className="pill bg-white/5 text-white/60 border border-white/10">
              {asset.category}
            </span>
            {tags.map((t) => (
              <span key={t} className="pill bg-white/5 text-white/40 border border-white/10">
                #{t}
              </span>
            ))}
          </div>
          <h1 className="text-3xl font-semibold leading-tight">{asset.title}</h1>
          <p className="text-sm text-white/50">by {asset.creatorName}</p>
        </div>

        <div className="prose prose-invert max-w-none text-sm leading-relaxed text-white/80">
          <p>{asset.description}</p>
        </div>

        <div className="card grid grid-cols-2 gap-4 p-4 text-xs sm:grid-cols-4">
          <Detail label="Kind" value={meta.label} />
          <Detail label="License" value={asset.license} />
          {configSummary && <Detail label="Format" value={configSummary} />}
          <Detail label="Status" value={asset.status} />
        </div>
      </div>

      <aside className="space-y-4">
        <div className="card p-5">
          <div className="text-xs uppercase tracking-wide text-white/40">Price</div>
          <div className="text-3xl font-semibold">{formatUsd(asset.priceUsdCents)}</div>
        </div>

        {alreadyOwns ? (
          <div className="card space-y-3 p-5">
            <p className="text-sm text-emerald-300">You already own this.</p>
            <Link href="/library" className="btn-primary w-full">Open in Library</Link>
          </div>
        ) : (
          <BuyPanel
            assetId={asset.id}
            assetSlug={asset.slug}
            kind={asset.kind}
            priceUsdCents={asset.priceUsdCents}
            isAuthenticated={Boolean(userId)}
          />
        )}

        <div className="card p-5 text-xs text-white/50">
          <p className="font-medium text-white/70">What happens next</p>
          {asset.kind === "file" ? (
            <ul className="mt-2 list-disc space-y-1 pl-4">
              <li>You get a download in your Library.</li>
              <li>A receipt NFT is minted to your wallet as proof of license.</li>
            </ul>
          ) : asset.kind === "nft_native" ? (
            <ul className="mt-2 list-disc space-y-1 pl-4">
              <li>The NFT is minted directly to your wallet.</li>
              <li>You can view it in your Library or on the explorer.</li>
            </ul>
          ) : (
            <p className="mt-2">This asset kind is reserved for a future phase.</p>
          )}
        </div>
      </aside>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-white/40">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}
