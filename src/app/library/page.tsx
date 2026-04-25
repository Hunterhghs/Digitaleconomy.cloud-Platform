import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { KindBadge } from "@/components/KindBadge";
import { LibraryRowActions } from "./LibraryRowActions";
import { explorerTxUrl } from "@/lib/chain";
import { shortHash } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function LibraryPage() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) redirect("/login?next=/library");

  const entitlements = await db.entitlement.findMany({
    where: { userId, revokedAt: null },
    include: { asset: true, order: true, downloadGrant: true },
    orderBy: { grantedAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Your Library</h1>
        <p className="text-sm text-white/50">
          Everything you own across every asset kind, in one place.
        </p>
      </div>

      {entitlements.length === 0 ? (
        <div className="card p-8 text-center text-sm text-white/60">
          You don&apos;t own any assets yet.{" "}
          <Link href="/browse" className="text-accent-glow hover:underline">
            Browse the catalog
          </Link>
          .
        </div>
      ) : (
        <div className="space-y-3">
          {entitlements.map((e) => (
            <div key={e.id} className="card flex flex-wrap items-center gap-4 p-4">
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <KindBadge kind={e.asset.kind} />
                  <span className="text-sm text-white/40">{e.asset.category}</span>
                </div>
                <Link
                  href={`/assets/${e.asset.slug}`}
                  className="font-medium hover:text-accent-glow"
                >
                  {e.asset.title}
                </Link>
                <div className="text-xs text-white/40">by {e.asset.creatorName}</div>
                {e.order.fulfillmentTxHash && (
                  <Link
                    href={explorerTxUrl(e.order.fulfillmentTxHash)}
                    target="_blank"
                    className="block font-mono text-[11px] text-white/40 hover:text-accent-glow"
                  >
                    tx {shortHash(e.order.fulfillmentTxHash)}
                  </Link>
                )}
              </div>
              <LibraryRowActions
                entitlementId={e.id}
                kind={e.asset.kind}
                fulfillmentTxHash={e.order.fulfillmentTxHash}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
