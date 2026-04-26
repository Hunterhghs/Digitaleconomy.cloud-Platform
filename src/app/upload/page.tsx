import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { UploadForm } from "./UploadForm";

export const dynamic = "force-dynamic";

export default async function UploadPage() {
  const user = await requireUser();
  if (!user) redirect("/login?next=/upload");

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
