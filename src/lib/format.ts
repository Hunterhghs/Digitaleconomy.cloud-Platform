export function formatUsd(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export function shortAddress(addr: string | null | undefined): string {
  if (!addr) return "";
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export function shortHash(hash: string | null | undefined): string {
  if (!hash) return "";
  return `${hash.slice(0, 10)}...${hash.slice(-6)}`;
}
