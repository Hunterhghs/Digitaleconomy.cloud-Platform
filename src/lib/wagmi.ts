import { http, createConfig } from "wagmi";
import { base, baseSepolia } from "wagmi/chains";
import { injected } from "wagmi/connectors";
import { env } from "./env";

// Minimal wagmi config: injected connector (MetaMask et al.) only. Swap in
// RainbowKit's getDefaultConfig() with the WalletConnect projectId once you
// have one - that adds Coinbase Wallet, WalletConnect, etc.
export const wagmiConfig = createConfig({
  chains: [base, baseSepolia],
  connectors: [injected({ shimDisconnect: true })],
  transports: {
    [base.id]: http(env.chain.name === "base" ? env.chain.rpcUrl || undefined : undefined),
    [baseSepolia.id]: http(env.chain.name === "base-sepolia" ? env.chain.rpcUrl || undefined : undefined),
  },
  ssr: true,
});
