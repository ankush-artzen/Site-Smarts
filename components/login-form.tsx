"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const passwordSaved = searchParams.get("notice") === "password_set";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <div className="mx-auto w-full max-w-md animate-rise">
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-accent-strong">
          Welcome back
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-foreground">
          Sign in to Site Smarts
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          Use your email and password to open the monitoring dashboard.
        </p>
      </div>

      <form
        onSubmit={handleLogin}
        className="space-y-5 rounded-2xl border border-border bg-surface p-6 shadow-[var(--shadow)] sm:p-8"
      >
        {passwordSaved ? (
          <p className="rounded-xl bg-teal-soft px-3 py-3 text-sm text-teal">
            Password saved. Sign in with your email and the password you just
            chose.
          </p>
        ) : null}

        <div>
          <label
            htmlFor="email"
            className="mb-2 block text-sm font-medium text-foreground"
          >
            Email address
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@solarshed.com"
            className="w-full rounded-xl border border-border bg-surface-soft px-4 py-3 text-foreground outline-none transition placeholder:text-muted/70 focus:border-accent focus:bg-surface focus:ring-2 focus:ring-accent/20"
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="mb-2 block text-sm font-medium text-foreground"
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            className="w-full rounded-xl border border-border bg-surface-soft px-4 py-3 text-foreground outline-none transition placeholder:text-muted/70 focus:border-accent focus:bg-surface focus:ring-2 focus:ring-accent/20"
          />
        </div>

        {error ? (
          <p className="rounded-xl bg-danger-soft px-3 py-3 text-sm text-danger">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-accent py-3 text-sm font-semibold text-white transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>

      <p className="mt-6 text-center text-xs text-muted">
        Secure monitoring access · Site Smarts by Solarshed
      </p>
    </div>
  );
}
