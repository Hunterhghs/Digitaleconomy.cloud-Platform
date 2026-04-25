"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

export function LoginForm() {
  const router = useRouter();
  const sp = useSearchParams();
  const next = sp.get("next") ?? "/library";
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    if (mode === "register") {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "Registration failed");
        setBusy(false);
        return;
      }
    }

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    if (!result || result.error) {
      setError("Invalid credentials");
      setBusy(false);
      return;
    }
    router.push(next);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="card space-y-3 p-5">
      <div className="flex gap-2 text-xs">
        <button
          type="button"
          className={`pill border ${mode === "login" ? "bg-accent text-white border-accent" : "bg-white/5 border-white/10 text-white/60"}`}
          onClick={() => setMode("login")}
        >
          Sign in
        </button>
        <button
          type="button"
          className={`pill border ${mode === "register" ? "bg-accent text-white border-accent" : "bg-white/5 border-white/10 text-white/60"}`}
          onClick={() => setMode("register")}
        >
          Create account
        </button>
      </div>
      <input
        className="input"
        type="email"
        placeholder="email@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <input
        className="input"
        type="password"
        placeholder="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        minLength={4}
        required
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
      <button type="submit" className="btn-primary w-full" disabled={busy}>
        {busy ? "..." : mode === "login" ? "Sign in" : "Create account"}
      </button>
      <p className="text-[11px] text-white/40">
        Demo admin: try the values from .env (PLATFORM_ADMIN_EMAIL / PASSWORD).
      </p>
    </form>
  );
}
