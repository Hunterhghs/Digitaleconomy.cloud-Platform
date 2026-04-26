import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { KindBadge } from "@/components/KindBadge";
import { LibraryRowActions } from "./LibraryRowActions";

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
          Every asset you&apos;ve grabbed while signed in. Re-download anytime.
        </p>
      </div>

      {entitlements.length === 0 ? (
        <div className="card p-8 text-center text-sm text-white/60">
          Your library is empty.{" "}
          <Link href="/browse" className="text-emerald-300 hover:underline">
            Browse the library
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
                  className="font-medium hover:text-emerald-300"
                >
                  {e.asset.title}
                </Link>
                <div className="text-xs text-white/40">
                  by {e.asset.creatorName} - saved{" "}
                  {e.grantedAt.toISOString().slice(0, 10)}
                </div>
              </div>
              <LibraryRowActions entitlementId={e.id} kind={e.asset.kind} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
