import Link from "next/link";
import { db } from "@/lib/db";
import { AssetCard } from "@/components/AssetCard";

export const dynamic = "force-dynamic";

type SearchParams = { q?: string; category?: string; sort?: string };

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { q, category, sort } = await searchParams;
  const orderBy =
    sort === "newest"
      ? [{ createdAt: "desc" as const }]
      : [{ downloadCount: "desc" as const }, { createdAt: "desc" as const }];

  const assets = await db.asset.findMany({
    where: {
      status: "published",
      ...(category ? { category } : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q } },
              { description: { contains: q } },
              { tagsCsv: { contains: q } },
              { creatorName: { contains: q } },
            ],
          }
        : {}),
    },
    orderBy,
  });

  const categories = await db.asset
    .findMany({
      where: { status: "published" },
      select: { category: true },
      distinct: ["category"],
    })
    .then((rows) => rows.map((r) => r.category).sort());

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Browse the library</h1>
        <p className="text-sm text-white/50">
          Everything below is free to download. No account required.
        </p>
      </div>

      <form className="flex flex-wrap gap-2" action="/browse">
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search by title, description, creator, or tag..."
          className="input max-w-md"
        />
        {category && <input type="hidden" name="category" value={category} />}
        {sort && <input type="hidden" name="sort" value={sort} />}
        <button type="submit" className="btn-primary">Search</button>
      </form>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <FilterChip href="/browse" active={!category && !sort}>All</FilterChip>
        <FilterChip
          href={`/browse?sort=newest${q ? `&q=${encodeURIComponent(q)}` : ""}`}
          active={sort === "newest"}
        >
          Newest
        </FilterChip>
        {categories.length > 0 && (
          <>
            <div className="mx-2 h-4 w-px bg-white/10" />
            {categories.map((c) => (
              <FilterChip
                key={c}
                href={`/browse?category=${encodeURIComponent(c)}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
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
          {q || category ? (
            <>Nothing matched those filters.</>
          ) : (
            <>
              The library is empty.{" "}
              <Link href="/login?next=/upload" className="text-emerald-300 hover:underline">
                Be the first to upload
              </Link>
              .
            </>
          )}
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
  children,
}: {
  href: string;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`pill border ${
        active
          ? "bg-emerald-500 text-white border-emerald-500"
          : "bg-white/5 text-white/70 border-white/10 hover:bg-white/10"
      }`}
    >
      {children}
    </Link>
  );
}
