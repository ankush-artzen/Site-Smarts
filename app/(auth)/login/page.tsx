import { Suspense } from "react";

import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <p className="mx-auto w-full max-w-md text-sm text-muted">
          Loading sign in…
        </p>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
