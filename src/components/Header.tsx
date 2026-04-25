import Link from "next/link";
import { auth } from "@/lib/auth";
import { env } from "@/lib/env";
import { LogoutButton } from "./LogoutButton";

export async function Header() {
  const session = await auth();
  const user = session?.user as { id?: string; email?: string; role?: string } | undefined;
  return (
    <header className="sticky top-0 z-30 border-b border-white/5 bg-ink/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-base font-semibold tracking-tight">
            {env.platform.name}
          </Link>
          <nav className="hidden gap-4 text-sm text-white/70 md:flex">
            <Link href="/browse" className="hover:text-white">Browse</Link>
            <Link href="/browse?kind=file" className="hover:text-white">Files</Link>
            <Link href="/browse?kind=nft_native" className="hover:text-white">NFTs</Link>
            {user && <Link href="/library" className="hover:text-white">Library</Link>}
            {user?.role === "admin" && (
              <Link href="/admin" className="hover:text-white">Admin</Link>
            )}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          {user ? (
            <>
              <span className="hidden text-xs text-white/50 sm:inline">{user.email}</span>
              <LogoutButton />
            </>
          ) : (
            <Link href="/login" className="btn-secondary">Sign in</Link>
          )}
        </div>
      </div>
    </header>
  );
}
