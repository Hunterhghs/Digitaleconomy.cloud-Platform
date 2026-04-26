import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { KindBadge } from "@/components/KindBadge";

export const dynamic = "force-dynamic";

export default async function MyUploadsPage() {
  const user = await requireUser();
  if (!user) redirect("/login?next=/my/uploads");

  const uploads = await db.asset.findMany({
    where: { uploaderUserId: user.id },
    orderBy: { createdAt: "desc" },
  });

  const totalDownloads = uploads.reduce((sum, a) => sum + a.downloadCount, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">My uploads</h1>
          <p className="text-sm text-white/50">
            Everything you&apos;ve shared with the community.
          </p>
        </div>
        <Link href="/upload" className="btn-primary">+ Upload another</Link>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Stat label="Uploads" value={uploads.length} />
        <Stat label="Total downloads" value={totalDownloads} />
        <Stat
          label="Live"
          value={uploads.filter((u) => u.status === "published").length}
        />
      </div>

      {uploads.length === 0 ? (
        <div className="card p-8 text-center text-sm text-white/60">
          You haven&apos;t shared anything yet.{" "}
          <Link href="/upload" className="text-emerald-300 hover:underline">
            Upload your first asset
          </Link>
          .
        </div>
      ) : (
        <div className="card divide-y divide-white/5">
          {uploads.map((a) => (
            <div key={a.id} className="flex flex-wrap items-center gap-4 p-4">
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <KindBadge kind={a.kind} />
                  <span className="text-xs text-white/40">{a.category}</span>
                  {a.status !== "published" && (
                    <span className="pill border border-amber-500/30 bg-amber-500/15 text-amber-300">
                      {a.status}
                    </span>
                  )}
                </div>
                <Link
                  href={`/assets/${a.slug}`}
                  className="font-medium hover:text-emerald-300"
                >
                  {a.title}
                </Link>
                <div className="text-xs text-white/40">
                  uploaded {a.createdAt.toISOString().slice(0, 10)} -{" "}
                  {a.downloadCount.toLocaleString()} downloads
                </div>
              </div>
              <Link href={`/assets/${a.slug}`} className="btn-secondary">
                View
              </Link>
            </div>
          ))}
        </div>
      )}
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
