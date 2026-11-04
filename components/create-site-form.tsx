"use client";

import { useState, useTransition } from "react";

import { createSite } from "@/lib/actions/sites";

type CreateSiteFormProps = {
  organizationId: string;
  organizationName: string;
};

export function CreateSiteForm({
  organizationId,
  organizationName,
}: CreateSiteFormProps) {
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [siteCode, setSiteCode] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    startTransition(async () => {
      const result = await createSite({
        organizationId,
        name,
        location: location || null,
        siteCode: siteCode || null,
        status: "active",
        timezone: "UTC",
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      setName("");
      setLocation("");
      setSiteCode("");
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4 rounded-2xl border border-border bg-surface p-5 shadow-[var(--shadow)]"
    >
      <div>
        <h3 className="font-display text-lg font-semibold text-foreground">
          Add a site
        </h3>
        <p className="mt-1 text-sm text-muted">
          Create a Solarshed site under {organizationName}.
        </p>
      </div>

      <input
        required
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="North Yard Array"
        className="w-full rounded-xl border border-border bg-surface-soft px-4 py-3 text-sm text-foreground outline-none transition focus:border-accent focus:bg-surface focus:ring-2 focus:ring-accent/20"
      />

      <input
        value={siteCode}
        onChange={(e) => setSiteCode(e.target.value)}
        placeholder="Site code (optional)"
        className="w-full rounded-xl border border-border bg-surface-soft px-4 py-3 text-sm text-foreground outline-none transition focus:border-accent focus:bg-surface focus:ring-2 focus:ring-accent/20"
      />

      <input
        value={location}
        onChange={(e) => setLocation(e.target.value)}
        placeholder="Location (optional)"
        className="w-full rounded-xl border border-border bg-surface-soft px-4 py-3 text-sm text-foreground outline-none transition focus:border-accent focus:bg-surface focus:ring-2 focus:ring-accent/20"
      />

      {error ? (
        <p className="rounded-xl bg-danger-soft px-3 py-3 text-sm text-danger">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="rounded-xl bg-teal px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Saving..." : "Create site"}
      </button>
    </form>
  );
}
