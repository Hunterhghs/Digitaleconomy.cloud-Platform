"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function RefundButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        className="btn-ghost text-amber-300 hover:text-amber-200"
        disabled={pending}
        onClick={() => {
          if (!confirm("Refund this order? Buyer's entitlement will be revoked.")) return;
          start(async () => {
            setError(null);
            const res = await fetch("/api/admin/refund", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ orderId }),
            });
            if (!res.ok) {
              const data = (await res.json().catch(() => ({}))) as { error?: string };
              setError(data.error ?? "Refund failed");
              return;
            }
            router.refresh();
          });
        }}
      >
        {pending ? "..." : "Refund"}
      </button>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
