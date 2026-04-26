import Link from "next/link";
import { KindBadge } from "./KindBadge";

type AssetCardProps = {
  asset: {
    slug: string;
    title: string;
    creatorName: string;
    kind: string;
    previewUrl: string | null;
    category: string;
    downloadCount?: number;
  };
};

export function AssetCard({ asset }: AssetCardProps) {
  return (
    <Link
      href={`/assets/${asset.slug}`}
      className="card group flex flex-col overflow-hidden transition hover:border-white/20"
    >
      <div className="relative flex aspect-[4/3] items-center justify-center bg-gradient-to-br from-accent/30 to-purple-500/20 text-4xl">
        {asset.previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={asset.previewUrl}
            alt={asset.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="text-white/30">{asset.title.slice(0, 1)}</span>
        )}
        <div className="absolute left-3 top-3">
          <KindBadge kind={asset.kind} />
        </div>
        <div className="absolute right-3 top-3">
          <span className="pill border border-emerald-400/30 bg-emerald-400/15 text-emerald-200">
            Free
          </span>
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-1 p-4">
        <div className="text-xs text-white/40">{asset.category}</div>
        <div className="font-medium leading-tight">{asset.title}</div>
        <div className="text-xs text-white/50">by {asset.creatorName}</div>
        <div className="mt-3 flex items-end justify-between">
          <span className="text-xs text-white/40">
            {(asset.downloadCount ?? 0).toLocaleString()} downloads
          </span>
          <span className="text-xs text-white/40 group-hover:text-white/70">View →</span>
        </div>
      </div>
    </Link>
  );
}
