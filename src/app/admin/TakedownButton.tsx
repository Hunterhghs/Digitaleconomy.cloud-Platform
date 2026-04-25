"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type Props = {
  assetId: string;
  isTakenDown: boolean;
};

export function TakedownButton({ assetId, isTakenDown }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function act(action: "takedown" | "restore") {
    start(async () => {
      setError(null);
      const res = await fetch("/api/admin/takedown", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assetId, action }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "Failed");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      {isTakenDown ? (
        <button
          type="button"
          className="btn-secondary"
          disabled={pending}
          onClick={() => act("restore")}
        >
          {pending ? "..." : "Restore"}
        </button>
      ) : (
        <button
          type="button"
          className="btn-ghost text-red-300 hover:text-red-200"
          disabled={pending}
          onClick={() => {
            if (confirm("Take this asset down? Existing entitlements will be revoked.")) {
              act("takedown");
            }
          }}
        >
          {pending ? "..." : "Takedown"}
        </button>
      )}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
