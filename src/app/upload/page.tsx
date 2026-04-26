import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { UploadForm } from "./UploadForm";

export const dynamic = "force-dynamic";

export default async function UploadPage() {
  const user = await requireUser();
  if (!user) redirect("/login?next=/upload");

  if (!env.uploads.enabled) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 py-4">
        <h1 className="text-2xl font-semibold">Uploads coming soon</h1>
        <div className="card space-y-3 p-5 text-sm text-white/70">
          <p>
            We&apos;re live as a read-only library while we finish wiring up
            file storage. Browse the catalog, save things to your Library, and
            check back shortly.
          </p>
          <p>
            If you run this platform: set <code>UPLOADS_ENABLED=true</code> +
            configure a writable storage backend (Vercel Blob, Cloudflare R2,
            or S3) to turn uploads on.
          </p>
          <Link href="/browse" className="btn-primary inline-flex">
            Browse the library
          </Link>
        </div>
      </div>
    );
  }

  const categories = await db.asset
    .findMany({
      where: { status: "published" },
      select: { category: true },
      distinct: ["category"],
    })
    .then((rows) => rows.map((r) => r.category).sort());

  return (
    <div className="mx-auto max-w-2xl space-y-6 py-4">
      <div>
        <h1 className="text-2xl font-semibold">Share an asset</h1>
        <p className="text-sm text-white/60">
          Upload a digital file you made and want to share for free. It goes
          live immediately. The admin can take it down if it breaks the rules
          (no pirated content, no malware, no illegal stuff).
        </p>
      </div>
      <UploadForm
        existingCategories={categories}
        maxBytes={env.uploads.maxBytes}
      />
    </div>
  );
}
