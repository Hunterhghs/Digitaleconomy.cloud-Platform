import Link from "next/link";
import { db } from "@/lib/db";
import { AssetCard } from "@/components/AssetCard";
import { ASSET_KINDS, KIND_META, type AssetKind } from "@/types/delivery";

export const dynamic = "force-dynamic";

type SearchParams = { kind?: string; q?: string; category?: string };

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { kind, q, category } = await searchParams;
  const kindFilter = kind && (ASSET_KINDS as readonly string[]).includes(kind) ? kind : undefined;

  const assets = await db.asset.findMany({
    where: {
      status: "published",
      ...(kindFilter ? { kind: kindFilter } : {}),
      ...(category ? { category } : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q } },
              { description: { contains: q } },
              { tagsCsv: { contains: q } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
  });

  const categories = await db.asset
    .findMany({ where: { status: "published" }, select: { category: true }, distinct: ["category"] })
    .then((rows) => rows.map((r) => r.category).sort());

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Browse</h1>
        <p className="text-sm text-white/50">
          Filter by kind or category, or search by keyword.
        </p>
      </div>

      <form className="flex flex-wrap gap-2" action="/browse">
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search assets..."
          className="input max-w-sm"
        />
        {kindFilter && <input type="hidden" name="kind" value={kindFilter} />}
        {category && <input type="hidden" name="category" value={category} />}
        <button type="submit" className="btn-primary">Search</button>
      </form>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <FilterChip href="/browse" active={!kindFilter && !category}>All</FilterChip>
        {ASSET_KINDS.map((k) => (
          <FilterChip
            key={k}
            href={`/browse?kind=${k}`}
            active={kindFilter === k}
            disabled={!KIND_META[k as AssetKind].shipped}
          >
            {KIND_META[k as AssetKind].label}
            {!KIND_META[k as AssetKind].shipped && (
              <span className="ml-1 text-white/40">(soon)</span>
            )}
          </FilterChip>
        ))}
        {categories.length > 0 && (
          <>
            <div className="mx-2 h-4 w-px bg-white/10" />
            {categories.map((c) => (
              <FilterChip
                key={c}
                href={`/browse?category=${encodeURIComponent(c)}${kindFilter ? `&kind=${kindFilter}` : ""}`}
                active={category === c}
              >
                {c}
              </FilterChip>
            ))}
          </>
        )}
      </div>

      {assets.length === 0 ? (
        <div className="card p-8 text-center text-sm text-white/60">
          No assets match those filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {assets.map((a) => (
            <AssetCard key={a.id} asset={a} />
          ))}
        </div>
      )}
    </div>
  );
}

function FilterChip({
  href,
  active,
  disabled,
  children,
}: {
  href: string;
  active?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  if (disabled) {
    return (
      <span className="pill bg-white/[0.02] text-white/30 cursor-not-allowed border border-white/5">
        {children}
      </span>
    );
  }
  return (
    <Link
      href={href}
      className={`pill border ${active ? "bg-accent text-white border-accent" : "bg-white/5 text-white/70 border-white/10 hover:bg-white/10"}`}
    >
      {children}
    </Link>
  );
}
