import { Suspense } from "react";
import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-sm space-y-6 py-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Sign in</h1>
        <p className="text-sm text-white/50">
          Use the demo admin account to explore, or create your own.
        </p>
      </div>
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}
