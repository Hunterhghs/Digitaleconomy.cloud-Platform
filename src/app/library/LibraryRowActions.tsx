"use client";

import { useState } from "react";

type Props = {
  entitlementId: string;
  kind: string;
};

export function LibraryRowActions({ entitlementId, kind }: Props) {
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

  return <span className="text-xs text-white/40">No action</span>;
}
