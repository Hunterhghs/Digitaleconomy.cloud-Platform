import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { formatUsd, shortHash } from "@/lib/format";
import { explorerTxUrl } from "@/lib/chain";
import { KindBadge } from "@/components/KindBadge";
import { RefundButton } from "./RefundButton";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage() {
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
          <h1 className="text-2xl font-semibold">Orders</h1>
          <p className="text-sm text-white/50">Latest 100 orders across all kinds.</p>
        </div>
        <Link href="/admin" className="btn-secondary">Back to admin</Link>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase text-white/40">
            <tr>
              <th className="px-4 py-3">When</th>
              <th className="px-4 py-3">Buyer</th>
              <th className="px-4 py-3">Asset</th>
              <th className="px-4 py-3">Rail</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Tx</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {orders.map((o) => (
              <tr key={o.id} className="align-top">
                <td className="px-4 py-3 text-xs text-white/50">
                  {o.createdAt.toISOString().slice(0, 16).replace("T", " ")}
                </td>
                <td className="px-4 py-3 text-xs">{o.user.email}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <KindBadge kind={o.asset.kind} />
                    <Link href={`/assets/${o.asset.slug}`} className="hover:text-accent-glow">
                      {o.asset.title}
                    </Link>
                  </div>
                </td>
                <td className="px-4 py-3 text-xs">{o.paymentRail}</td>
                <td className="px-4 py-3">{formatUsd(o.amountUsdCents)}</td>
                <td className="px-4 py-3">
                  <StatusPill status={o.status} />
                  {o.errorMessage && (
                    <div className="mt-1 text-xs text-red-400">{o.errorMessage}</div>
                  )}
                </td>
                <td className="px-4 py-3 text-xs">
                  {o.fulfillmentTxHash && (
                    <Link
                      href={explorerTxUrl(o.fulfillmentTxHash)}
                      target="_blank"
                      className="font-mono text-accent-glow hover:text-accent"
                    >
                      {shortHash(o.fulfillmentTxHash)}
                    </Link>
                  )}
                </td>
                <td className="px-4 py-3">
                  {o.status === "fulfilled" || o.status === "paid" ? (
                    <RefundButton orderId={o.id} />
                  ) : null}
                </td>
              </tr>
            ))}
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
    refunded: "bg-amber-500/15 text-amber-300 border border-amber-500/30",
    failed: "bg-red-500/15 text-red-300 border border-red-500/30",
  };
  return <span className={`pill ${styles[status] ?? styles.pending}`}>{status}</span>;
}
