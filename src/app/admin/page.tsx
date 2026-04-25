import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { formatUsd } from "@/lib/format";
import { KindBadge } from "@/components/KindBadge";
import { TakedownButton } from "./TakedownButton";

export const dynamic = "force-dynamic";

export default async function AdminHomePage() {
  const admin = await requireAdmin();
  if (!admin) redirect("/login?next=/admin");

  const [assetCount, publishedCount, takedownCount, orderCount, fulfilledCount, refundedCount, recent] =
    await Promise.all([
      db.asset.count(),
      db.asset.count({ where: { status: "published" } }),
      db.asset.count({ where: { status: "takedown" } }),
      db.order.count(),
      db.order.count({ where: { status: "fulfilled" } }),
      db.order.count({ where: { status: "refunded" } }),
      db.asset.findMany({ orderBy: { createdAt: "desc" }, take: 12 }),
    ]);

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Admin</h1>
          <p className="text-sm text-white/50">Catalog + orders + DMCA workflow.</p>
        </div>
        <Link href="/admin/orders" className="btn-secondary">View orders</Link>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <Stat label="Assets" value={assetCount} />
        <Stat label="Published" value={publishedCount} />
        <Stat label="Taken down" value={takedownCount} />
        <Stat label="Orders" value={orderCount} />
        <Stat label="Fulfilled" value={fulfilledCount} />
        <Stat label="Refunded" value={refundedCount} />
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-white/40">
          Catalog
        </h2>
        <div className="card divide-y divide-white/5">
          {recent.map((asset) => (
            <div key={asset.id} className="flex flex-wrap items-center gap-4 p-4">
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <KindBadge kind={asset.kind} />
                  <span className="text-xs text-white/40">{asset.category}</span>
                  {asset.status !== "published" && (
                    <span className="pill bg-red-500/15 text-red-300 border border-red-500/30">
                      {asset.status}
                    </span>
                  )}
                </div>
                <Link
                  href={`/assets/${asset.slug}`}
                  className="font-medium hover:text-accent-glow"
                >
                  {asset.title}
                </Link>
                <div className="text-xs text-white/40">
                  by {asset.creatorName} - {formatUsd(asset.priceUsdCents)}
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
      <div className="text-2xl font-semibold">{value}</div>
    </div>
  );
}
