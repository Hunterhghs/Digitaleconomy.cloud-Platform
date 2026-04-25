import Link from "next/link";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { dispatch } from "@/lib/fulfillment";
import { formatUsd, shortHash } from "@/lib/format";
import { explorerTxUrl } from "@/lib/chain";
import { KindBadge } from "@/components/KindBadge";

export const dynamic = "force-dynamic";

type SearchParams = { orderId?: string; simulated?: string };

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId || !sp.orderId) {
    return <p className="text-sm text-white/60">Missing order or session.</p>;
  }

  let order = await db.order.findUnique({
    where: { id: sp.orderId },
    include: { asset: true, entitlement: true },
  });
  if (!order || order.userId !== userId) {
    return <p className="text-sm text-white/60">Order not found.</p>;
  }

  // If Stripe webhook beat us here we're already fulfilled; if not (and the
  // order is paid), run the dispatcher inline so the buyer immediately sees
  // their entitlement on this page. Idempotent.
  if (order.status === "paid") {
    try {
      await dispatch(order.id);
      order = await db.order.findUnique({
        where: { id: order.id },
        include: { asset: true, entitlement: true },
      });
    } catch {
      /* error captured on order */
    }
  }

  if (!order) return <p className="text-sm text-white/60">Order not found.</p>;

  return (
    <div className="mx-auto max-w-xl space-y-5 py-6">
      <div className="space-y-1">
        <p className="text-xs uppercase tracking-widest text-emerald-300">
          {order.status === "fulfilled" ? "Purchase complete" : "Order received"}
        </p>
        <h1 className="text-2xl font-semibold">{order.asset.title}</h1>
        <p className="text-sm text-white/50">
          {formatUsd(order.amountUsdCents)} - paid via {order.paymentRail}
          {sp.simulated ? " - simulated for local demo" : ""}
        </p>
      </div>

      <div className="card space-y-3 p-5 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-white/40">Status</span>
          <span className="font-medium">{order.status}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-white/40">Kind</span>
          <KindBadge kind={order.asset.kind} />
        </div>
        {order.fulfillmentTxHash && (
          <div className="flex items-center justify-between">
            <span className="text-white/40">
              {order.asset.kind === "nft_native" ? "Mint tx" : "Receipt tx"}
            </span>
            <Link
              href={explorerTxUrl(order.fulfillmentTxHash)}
              target="_blank"
              className="font-mono text-xs text-accent-glow hover:text-accent"
            >
              {shortHash(order.fulfillmentTxHash)}
            </Link>
          </div>
        )}
        {order.errorMessage && (
          <p className="text-xs text-red-400">{order.errorMessage}</p>
        )}
      </div>

      <div className="flex gap-3">
        <Link href="/library" className="btn-primary flex-1">Open Library</Link>
        <Link href="/browse" className="btn-secondary flex-1">Keep browsing</Link>
      </div>
    </div>
  );
}
