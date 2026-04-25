"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { injected } from "wagmi/connectors";
import { formatUsd, shortAddress } from "@/lib/format";
import { KIND_META, type AssetKind } from "@/types/delivery";

type Props = {
  assetId: string;
  assetSlug: string;
  kind: string;
  priceUsdCents: number;
  isAuthenticated: boolean;
};

export function BuyPanel({ assetId, assetSlug, kind, priceUsdCents, isAuthenticated }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<"stripe" | "crypto" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { address, isConnected } = useAccount();
  const { connect, isPending: connecting } = useConnect();
  const { disconnect } = useDisconnect();

  const meta = KIND_META[kind as AssetKind] ?? KIND_META.file;

  if (!isAuthenticated) {
    return (
      <div className="card space-y-3 p-5">
        <p className="text-sm text-white/70">Sign in to buy this asset.</p>
        <a
          href={`/login?next=${encodeURIComponent(`/assets/${assetSlug}`)}`}
          className="btn-primary w-full"
        >
          Sign in to continue
        </a>
      </div>
    );
  }

  async function buyWithStripe() {
    setBusy("stripe");
    setError(null);
    try {
      const res = await fetch("/api/checkout/stripe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assetId }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error ?? "Checkout failed");
      window.location.href = data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
      setBusy(null);
    }
  }

  async function buyWithCrypto() {
    setBusy("crypto");
    setError(null);
    try {
      const recipient = address ?? null;
      const res = await fetch("/api/checkout/crypto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assetId, recipientAddress: recipient }),
      });
      const data = (await res.json()) as { orderId?: string; error?: string };
      if (!res.ok || !data.orderId) throw new Error(data.error ?? "Crypto checkout failed");
      router.push(`/checkout/success?orderId=${data.orderId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
      setBusy(null);
    }
  }

  return (
    <div className="card space-y-4 p-5">
      <button
        type="button"
        className="btn-primary w-full"
        disabled={busy !== null}
        onClick={buyWithStripe}
      >
        {busy === "stripe" ? "Redirecting..." : `${meta.cta} - card (${formatUsd(priceUsdCents)})`}
      </button>

      <div className="flex items-center gap-2 text-xs text-white/40">
        <div className="h-px flex-1 bg-white/10" />
        or pay with crypto (USDC on Base)
        <div className="h-px flex-1 bg-white/10" />
      </div>

      {!isConnected ? (
        <button
          type="button"
          className="btn-secondary w-full"
          disabled={connecting || busy !== null}
          onClick={() => connect({ connector: injected() })}
        >
          {connecting ? "Connecting..." : "Connect wallet"}
        </button>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-white/60">
            <span>Connected: {shortAddress(address)}</span>
            <button type="button" className="text-white/40 hover:text-white" onClick={() => disconnect()}>
              Disconnect
            </button>
          </div>
          <button
            type="button"
            className="btn-secondary w-full"
            disabled={busy !== null}
            onClick={buyWithCrypto}
          >
            {busy === "crypto" ? "Submitting..." : `Pay ${formatUsd(priceUsdCents)} with USDC`}
          </button>
        </div>
      )}

      <button
        type="button"
        className="btn-ghost w-full text-xs"
        disabled={busy !== null}
        onClick={buyWithCrypto}
        title="Demo only: pay to your custodial wallet without connecting an external wallet"
      >
        Skip wallet & use custodial (demo)
      </button>

      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
