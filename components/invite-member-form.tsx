"use client";

import { useState, useTransition } from "react";

import { addOrganizationMember } from "@/lib/actions/organizations";

type InviteMemberFormProps = {
  organizationId: string;
  organizationName: string;
};

const roles = [
  { value: "viewer", label: "Viewer" },
  { value: "operator", label: "Operator" },
  { value: "admin", label: "Admin" },
] as const;

export function InviteMemberForm({
  organizationId,
  organizationName,
}: InviteMemberFormProps) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<(typeof roles)[number]["value"]>("viewer");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSuccess("");

    const invitedEmail = email.trim();

    startTransition(async () => {
      const result = await addOrganizationMember({
        organizationId,
        email: invitedEmail,
        role,
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      setEmail("");
      setSuccess(
        result.data.invited
          ? `Invitation sent to ${invitedEmail}. They choose a password from the email, then sign in.`
          : `${invitedEmail} already has an account and was added to ${organizationName}.`
      );
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-5 rounded-2xl border border-border bg-surface p-6 shadow-[var(--shadow)]"
    >
      <div>
        <h2 className="font-display text-2xl font-semibold text-foreground">
          Invite a user
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          Send an invitation to join {organizationName}. They receive an email,
          open Accept invitation, choose a password on Site Smarts, then sign
          in with that email and password.
        </p>
      </div>

      <div>
        <label
          htmlFor="invite-email"
          className="mb-2 block text-sm font-medium text-foreground"
        >
          Email address
        </label>
        <input
          id="invite-email"
          type="email"
          required
          autoComplete="off"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="customer@example.com"
          className="w-full rounded-xl border border-border bg-surface-soft px-4 py-3 text-foreground outline-none transition placeholder:text-muted/70 focus:border-accent focus:bg-surface focus:ring-2 focus:ring-accent/20"
        />
      </div>

      <div>
        <label
          htmlFor="invite-role"
          className="mb-2 block text-sm font-medium text-foreground"
        >
          Role
        </label>
        <select
          id="invite-role"
          value={role}
          onChange={(e) =>
            setRole(e.target.value as (typeof roles)[number]["value"])
          }
          className="w-full rounded-xl border border-border bg-surface-soft px-4 py-3 text-foreground outline-none transition focus:border-accent focus:bg-surface focus:ring-2 focus:ring-accent/20"
        >
          {roles.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {error ? (
        <p className="rounded-xl bg-danger-soft px-3 py-3 text-sm text-danger">
          {error}
        </p>
      ) : null}

      {success ? (
        <p className="rounded-xl bg-teal-soft px-3 py-3 text-sm text-teal">
          {success}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-accent py-3 text-sm font-semibold text-white transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Sending invitation..." : "Send invitation"}
      </button>
    </form>
  );
}
