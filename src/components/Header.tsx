import Link from "next/link";
import { auth } from "@/lib/auth";
import { env } from "@/lib/env";
import { LogoutButton } from "./LogoutButton";

export async function Header() {
  const session = await auth();
  const user = session?.user as
    | { id?: string; email?: string; role?: string }
    | undefined;
  return (
    <header className="sticky top-0 z-30 border-b border-white/5 bg-ink/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 text-base font-semibold tracking-tight">
            <span>{env.platform.name}</span>
            <span className="hidden rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-emerald-300 sm:inline">
              Free
            </span>
          </Link>
          <nav className="hidden gap-4 text-sm text-white/70 md:flex">
            <Link href="/browse" className="hover:text-white">Browse</Link>
            {user && <Link href="/upload" className="hover:text-white">Upload</Link>}
            {user && <Link href="/my/uploads" className="hover:text-white">My uploads</Link>}
            {user && <Link href="/library" className="hover:text-white">Library</Link>}
            {user?.role === "admin" && (
              <Link href="/admin" className="hover:text-white">Admin</Link>
            )}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          {user ? (
            <>
              <Link href="/upload" className="btn-primary hidden sm:inline-flex">
                + Upload
              </Link>
              <span className="hidden text-xs text-white/50 sm:inline">{user.email}</span>
              <LogoutButton />
            </>
          ) : (
            <>
              <Link href="/login?next=/upload" className="hidden text-sm text-white/60 hover:text-white sm:inline">
                Share something
              </Link>
              <Link href="/login" className="btn-secondary">Sign in</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
