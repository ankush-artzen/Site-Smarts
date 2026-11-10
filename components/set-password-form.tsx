"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";

import {
  establishInviteSession,
  setInvitedPassword,
} from "@/lib/actions/auth";
import {
  createClient,
  createInviteSessionClient,
} from "@/lib/supabase/client";

const INVITE_SESSION_KEY = "ss_invite_session";

type Phase = "checking" | "ready" | "invalid";

export function SetPasswordForm() {
  const [phase, setPhase] = useState<Phase>("checking");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;

    async function acceptInvitation() {
      const params = new URLSearchParams(window.location.search);
      const tokenHash = params.get("token_hash");
      const type = params.get("type");

      if (tokenHash && type === "invite") {
        const result = await establishInviteSession({
          tokenHash,
          type: "invite",
        });
        if (cancelled) return;

        if (!result.ok) {
          setError(result.error);
          setPhase("invalid");
          return;
        }

        window.history.replaceState(null, "", "/set-password");
        sessionStorage.setItem(INVITE_SESSION_KEY, "1");
        setPhase("ready");
        return;
      }

      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const accessToken = hash.get("access_token");
      const refreshToken = hash.get("refresh_token");
      const hashType = hash.get("type");

      if (accessToken && refreshToken && (hashType === "invite" || !hashType)) {
        const supabase = createInviteSessionClient();
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (cancelled) return;

        if (sessionError) {
          setError("This invitation link is invalid or has expired.");
          setPhase("invalid");
          return;
        }

        window.history.replaceState(null, "", "/set-password");
        sessionStorage.setItem(INVITE_SESSION_KEY, "1");
        setPhase("ready");
        return;
      }

      if (hash.get("error") || params.get("error")) {
        if (!cancelled) {
          setError("This invitation link is invalid or has expired.");
          setPhase("invalid");
        }
        return;
      }

      if (sessionStorage.getItem(INVITE_SESSION_KEY) === "1") {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (cancelled) return;

        if (user) {
          setPhase("ready");
          return;
        }

        sessionStorage.removeItem(INVITE_SESSION_KEY);
      }

      if (!cancelled) {
        setError("Open the invitation link from your email to set a password.");
        setPhase("invalid");
      }
    }

    void acceptInvitation();

    return () => {
      cancelled = true;
    };
  }, []);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    startTransition(async () => {
      sessionStorage.removeItem(INVITE_SESSION_KEY);
      const result = await setInvitedPassword({ password, confirmPassword });

      if (result && !result.ok) {
        sessionStorage.setItem(INVITE_SESSION_KEY, "1");
        setError(result.error);
      }
    });
  }

  return (
    <div className="mx-auto w-full max-w-md animate-rise">
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-accent-strong">
          Accept invitation
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-foreground">
          Set your password
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          Choose a password for Site Smarts. After it is saved, sign in with
          your email and this password.
        </p>
      </div>

      {phase === "checking" ? (
        <p className="rounded-2xl border border-border bg-surface px-6 py-8 text-sm text-muted shadow-[var(--shadow)]">
          Checking your invitation…
        </p>
      ) : null}

      {phase === "invalid" ? (
        <div className="space-y-4 rounded-2xl border border-border bg-surface p-6 shadow-[var(--shadow)]">
          <p className="rounded-xl bg-danger-soft px-3 py-3 text-sm text-danger">
            {error}
          </p>
          <Link
            href="/login"
            className="inline-flex text-sm font-semibold text-accent-strong"
          >
            Back to sign in
          </Link>
        </div>
      ) : null}

      {phase === "ready" ? (
        <form
          onSubmit={onSubmit}
          className="space-y-5 rounded-2xl border border-border bg-surface p-6 shadow-[var(--shadow)] sm:p-8"
        >
          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-medium text-foreground"
            >
              New password
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              className="w-full rounded-xl border border-border bg-surface-soft px-4 py-3 text-foreground outline-none transition placeholder:text-muted/70 focus:border-accent focus:bg-surface focus:ring-2 focus:ring-accent/20"
            />
          </div>

          <div>
            <label
              htmlFor="confirm-password"
              className="mb-2 block text-sm font-medium text-foreground"
            >
              Confirm password
            </label>
            <input
              id="confirm-password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter your password"
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
            disabled={pending}
            className="w-full rounded-xl bg-accent py-3 text-sm font-semibold text-white transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "Saving password..." : "Save password"}
          </button>
        </form>
      ) : null}
    </div>
  );
}
