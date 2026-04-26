import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { KindBadge } from "@/components/KindBadge";
import { TakedownButton } from "./TakedownButton";

export const dynamic = "force-dynamic";

export default async function AdminHomePage() {
  const admin = await requireAdmin();
  if (!admin) redirect("/login?next=/admin");

  const [
    assetCount,
    publishedCount,
    takedownCount,
    userCount,
    uploaderCount,
    totalDownloads,
    recent,
  ] = await Promise.all([
    db.asset.count(),
    db.asset.count({ where: { status: "published" } }),
    db.asset.count({ where: { status: "takedown" } }),
    db.user.count(),
    db.user
      .findMany({
        where: { uploadedAssets: { some: {} } },
        select: { id: true },
      })
      .then((rows) => rows.length),
    db.asset
      .aggregate({ _sum: { downloadCount: true } })
      .then((agg) => agg._sum.downloadCount ?? 0),
    db.asset.findMany({
      orderBy: { createdAt: "desc" },
      take: 25,
      include: { uploader: { select: { email: true } } },
    }),
  ]);

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Admin</h1>
          <p className="text-sm text-white/50">
            Catalog moderation + activity. Post-moderation: assets go live on
            upload; take down anything that breaks the rules.
          </p>
        </div>
        <Link href="/admin/orders" className="btn-secondary">View activity</Link>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <Stat label="Assets" value={assetCount} />
        <Stat label="Published" value={publishedCount} />
        <Stat label="Taken down" value={takedownCount} />
        <Stat label="Users" value={userCount} />
        <Stat label="Uploaders" value={uploaderCount} />
        <Stat label="Downloads" value={totalDownloads} />
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-white/40">
          Recent uploads
        </h2>
        <div className="card divide-y divide-white/5">
          {recent.map((asset) => (
            <div key={asset.id} className="flex flex-wrap items-center gap-4 p-4">
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <KindBadge kind={asset.kind} />
                  <span className="text-xs text-white/40">{asset.category}</span>
                  {asset.status !== "published" && (
                    <span className="pill border border-red-500/30 bg-red-500/15 text-red-300">
                      {asset.status}
                    </span>
                  )}
                </div>
                <Link
                  href={`/assets/${asset.slug}`}
                  className="font-medium hover:text-emerald-300"
                >
                  {asset.title}
                </Link>
                <div className="text-xs text-white/40">
                  by {asset.creatorName}
                  {asset.uploader && (
                    <> - uploaded by {asset.uploader.email}</>
                  )}
                  {" - "}
                  {asset.downloadCount.toLocaleString()} downloads
                </div>
              </div>
              <TakedownButton
                assetId={asset.id}
                isTakenDown={asset.status === "takedown"}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="card p-4">
      <div className="text-xs uppercase tracking-wide text-white/40">{label}</div>
      <div className="text-2xl font-semibold">{value.toLocaleString()}</div>
    </div>
  );
}
