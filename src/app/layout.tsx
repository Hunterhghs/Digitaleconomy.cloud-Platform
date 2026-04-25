import type { Metadata } from "next";
import { env } from "@/lib/env";
import { Header } from "@/components/Header";
import { Providers } from "@/components/Providers";
import "./globals.css";

export const metadata: Metadata = {
  title: env.platform.name,
  description:
    "Digitaleconomy.cloud - one home for files, NFTs, and every kind of digital asset. Pay with card or crypto.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>
        <Providers>
          <Header />
          <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
          <footer className="mx-auto max-w-6xl px-4 py-12 text-xs text-white/40">
            {env.platform.name} - polymorphic asset model demo. v0.
          </footer>
        </Providers>
      </body>
    </html>
  );
}
