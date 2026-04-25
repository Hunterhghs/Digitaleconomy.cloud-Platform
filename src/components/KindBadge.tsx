import { KIND_META, type AssetKind } from "@/types/delivery";

const STYLES: Record<AssetKind, string> = {
  file: "bg-sky-500/15 text-sky-300 border border-sky-500/30",
  nft_native: "bg-purple-500/15 text-purple-300 border border-purple-500/30",
  stream: "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30",
  license_key: "bg-amber-500/15 text-amber-300 border border-amber-500/30",
  ai_asset: "bg-pink-500/15 text-pink-300 border border-pink-500/30",
  bundle: "bg-white/10 text-white/80 border border-white/20",
};

export function KindBadge({ kind }: { kind: string }) {
  const safe = (kind in KIND_META ? kind : "file") as AssetKind;
  return (
    <span className={`pill ${STYLES[safe]}`}>{KIND_META[safe].label}</span>
  );
}
