"use client";

import Link from "next/link";
import { useState } from "react";
import { explorerTxUrl } from "@/lib/chain";

type Props = {
  entitlementId: string;
  kind: string;
  fulfillmentTxHash: string | null;
};

export function LibraryRowActions({ entitlementId, kind, fulfillmentTxHash }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function download() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/download/${entitlementId}`);
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error ?? "Download failed");
      window.location.href = data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setBusy(false);
    }
  }

  if (kind === "file") {
    return (
      <div className="flex flex-col items-end gap-1">
        <button type="button" className="btn-primary" disabled={busy} onClick={download}>
          {busy ? "..." : "Download"}
        </button>
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
    );
  }

  if (kind === "nft_native") {
    return (
      <div className="flex flex-col items-end gap-1">
        {fulfillmentTxHash ? (
          <Link
            href={explorerTxUrl(fulfillmentTxHash)}
            target="_blank"
            className="btn-secondary"
          >
            View on chain
          </Link>
        ) : (
          <span className="text-xs text-white/40">Mint pending</span>
        )}
      </div>
    );
  }

  return <span className="text-xs text-white/40">No action</span>;
}
