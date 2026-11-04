"use client";

import { useState, useTransition } from "react";

import { createOrganization } from "@/lib/actions/organizations";

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export function CreateOrganizationForm() {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function onNameChange(value: string) {
    setName(value);
    setSlug(slugify(value));
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    startTransition(async () => {
      const result = await createOrganization({ name, slug });
      if (!result.ok) {
        setError(result.error);
      }
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mx-auto max-w-lg space-y-5 rounded-2xl border border-border bg-surface p-6 shadow-[var(--shadow)]"
    >
      <div>
        <h2 className="font-display text-2xl font-semibold text-foreground">
          Create your organization
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          Organizations own Solarshed sites. You will become the owner of this
          workspace.
        </p>
      </div>

      <div>
        <label
          htmlFor="org-name"
          className="mb-2 block text-sm font-medium text-foreground"
        >
          Organization name
        </label>
        <input
          id="org-name"
          required
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="Solarshed"
          className="w-full rounded-xl border border-border bg-surface-soft px-4 py-3 text-foreground outline-none transition focus:border-accent focus:bg-surface focus:ring-2 focus:ring-accent/20"
        />
      </div>

      <div>
        <label
          htmlFor="org-slug"
          className="mb-2 block text-sm font-medium text-foreground"
        >
          Slug
        </label>
        <input
          id="org-slug"
          required
          value={slug}
          onChange={(e) => setSlug(slugify(e.target.value))}
          placeholder="solarshed"
          className="w-full rounded-xl border border-border bg-surface-soft px-4 py-3 text-foreground outline-none transition focus:border-accent focus:bg-surface focus:ring-2 focus:ring-accent/20"
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
        {pending ? "Creating..." : "Create organization"}
      </button>
    </form>
  );
}
