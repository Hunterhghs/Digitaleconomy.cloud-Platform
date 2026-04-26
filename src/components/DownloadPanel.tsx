"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  assetId: string;
  isAuthenticated: boolean;
};

export function DownloadPanel({ assetId, isAuthenticated }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function download() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assetId }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error ?? "Download failed");
      window.location.href = data.url;
      if (isAuthenticated) {
        router.refresh();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card space-y-3 p-5">
      <button
        type="button"
        className="btn-primary w-full text-base"
        disabled={busy}
        onClick={download}
      >
        {busy ? "Preparing…" : "Download free"}
      </button>
      <p className="text-center text-xs text-white/50">
        {isAuthenticated
          ? "Saved to your Library so you can re-download anytime."
          : "No account required. Sign in to save it to your Library."}
      </p>
      {error && <p className="text-center text-xs text-red-400">{error}</p>}
    </div>
  );
}
