import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { KindBadge } from "@/components/KindBadge";

export const dynamic = "force-dynamic";

export default async function AdminActivityPage() {
  const admin = await requireAdmin();
  if (!admin) redirect("/login?next=/admin/orders");

  const orders = await db.order.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { asset: true, user: true },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Activity</h1>
          <p className="text-sm text-white/50">
            Latest 100 claims by signed-in users. Anonymous downloads are
            counted on each asset but not listed here.
          </p>
        </div>
        <Link href="/admin" className="btn-secondary">Back to admin</Link>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase text-white/40">
            <tr>
              <th className="px-4 py-3">When</th>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Asset</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {orders.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-white/50">
                  No claims yet.
                </td>
              </tr>
            ) : (
              orders.map((o) => (
                <tr key={o.id} className="align-top">
                  <td className="px-4 py-3 text-xs text-white/50">
                    {o.createdAt.toISOString().slice(0, 16).replace("T", " ")}
                  </td>
                  <td className="px-4 py-3 text-xs">{o.user.email}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <KindBadge kind={o.asset.kind} />
                      <Link
                        href={`/assets/${o.asset.slug}`}
                        className="hover:text-emerald-300"
                      >
                        {o.asset.title}
                      </Link>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill status={o.status} />
                    {o.errorMessage && (
                      <div className="mt-1 text-xs text-red-400">{o.errorMessage}</div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: "bg-white/5 text-white/60 border border-white/10",
    paid: "bg-sky-500/15 text-sky-300 border border-sky-500/30",
    fulfilled: "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30",
    failed: "bg-red-500/15 text-red-300 border border-red-500/30",
  };
  return <span className={`pill ${styles[status] ?? styles.pending}`}>{status}</span>;
}
