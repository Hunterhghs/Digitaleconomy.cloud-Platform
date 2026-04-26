import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { KindBadge } from "@/components/KindBadge";
import { DownloadPanel } from "@/components/DownloadPanel";
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
  const asset = await db.asset.findUnique({
    where: { slug },
    include: { uploader: { select: { id: true, name: true, email: true } } },
  });
  if (!asset || asset.status !== "published") return notFound();

  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  const alreadyClaimed = userId
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
      configSummary = `${cfg.mimeType} - ${formatBytes(cfg.fileSizeBytes)}`;
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
            <span className="pill border border-emerald-400/30 bg-emerald-400/15 text-emerald-200">
              Free
            </span>
            {tags.map((t) => (
              <span key={t} className="pill bg-white/5 text-white/40 border border-white/10">
                #{t}
              </span>
            ))}
          </div>
          <h1 className="text-3xl font-semibold leading-tight">{asset.title}</h1>
          <p className="text-sm text-white/50">
            by {asset.creatorName}
            {asset.uploader && (
              <span className="text-white/30">
                {" "}- uploaded by {asset.uploader.name ?? asset.uploader.email}
              </span>
            )}
          </p>
        </div>

        <div className="prose prose-invert max-w-none whitespace-pre-wrap text-sm leading-relaxed text-white/80">
          {asset.description}
        </div>

        <div className="card grid grid-cols-2 gap-4 p-4 text-xs sm:grid-cols-4">
          <Detail label="Kind" value={meta.label} />
          <Detail label="License" value={asset.license} />
          {configSummary && <Detail label="Format" value={configSummary} />}
          <Detail label="Downloads" value={asset.downloadCount.toLocaleString()} />
        </div>
      </div>

      <aside className="space-y-4">
        {asset.kind === "file" ? (
          <>
            {alreadyClaimed && (
              <div className="card p-4 text-sm text-emerald-200">
                Already in your Library.{" "}
                <Link href="/library" className="underline">Open Library →</Link>
              </div>
            )}
            <DownloadPanel assetId={asset.id} isAuthenticated={Boolean(userId)} />
          </>
        ) : (
          <div className="card space-y-2 p-5 text-sm text-white/60">
            <p className="font-medium text-white/80">Not yet available</p>
            <p>
              The {meta.label.toLowerCase()} kind is reserved for a future phase.
              Right now the platform ships the file kind only.
            </p>
          </div>
        )}

        <div className="card p-5 text-xs text-white/50">
          <p className="font-medium text-white/70">How it works</p>
          <ul className="mt-2 list-disc space-y-1 pl-4">
            <li>Click <span className="text-white/80">Download free</span> - the file is yours, no charge.</li>
            <li>Sign in first to save it in your Library for re-downloads.</li>
            <li>If you made this and shouldn&apos;t see it here, the admin can take it down.</li>
          </ul>
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

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}
