"use server";

import { revalidatePath } from "next/cache";

import { canManageMembers, canManageOrganization } from "@/lib/auth/roles";
import { requireProfile } from "@/lib/auth/session";
import { getSiteUrl } from "@/lib/auth/site-url";
import type { Organization, OrgRole } from "@/lib/types/database";
import {
  addMemberSchema,
  createOrganizationSchema,
  updateMemberRoleSchema,
  updateOrganizationSchema,
} from "@/lib/validation/org";

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export async function createOrganization(
  input: unknown
): Promise<ActionResult<Organization>> {
  const parsed = createOrganizationSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { supabase } = await requireProfile();
  const { name, slug } = parsed.data;

  // Live Supabase RPC: create_organization(org_name, org_slug)
  const { data, error } = await supabase.rpc("create_organization", {
    org_name: name,
    org_slug: slug,
  });

  if (error) {
    if (error.message.toLowerCase().includes("duplicate") || error.code === "23505") {
      return { ok: false, error: "That organization slug is already taken" };
    }
    console.error("createOrganization failed:", error.message);
    return { ok: false, error: error.message || "Could not create organization" };
  }

  revalidatePath("/dashboard");
  return { ok: true, data: data as Organization };
}

export async function updateOrganization(
  input: unknown
): Promise<ActionResult> {
  const parsed = updateOrganizationSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { supabase, user } = await requireProfile();
  const { organizationId, name } = parsed.data;

  const { data: membership } = await supabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", organizationId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership || !canManageOrganization(membership.role as OrgRole)) {
    return { ok: false, error: "You do not have permission to update this organization" };
  }

  const { error } = await supabase
    .from("organizations")
    .update({ name })
    .eq("id", organizationId);

  if (error) {
    console.error("updateOrganization failed:", error.message);
    return { ok: false, error: "Could not update organization" };
  }

  revalidatePath("/dashboard");
  return { ok: true, data: undefined };
}

function isExistingAccountError(error: { message: string; code?: string }) {
  const message = error.message.toLowerCase();
  return (
    error.code === "email_exists" ||
    message.includes("already been registered") ||
    message.includes("already registered") ||
    message.includes("already exists")
  );
}

async function findUserIdByEmail(email: string) {
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();

  const { data, error } = await admin.rpc("user_id_by_email", {
    lookup_email: email,
  });

  if (!error) {
    return typeof data === "string" ? data : null;
  }

  // Live databases may not have the lookup function yet.
  const normalized = email.toLowerCase();
  for (let page = 1; page <= 10; page += 1) {
    const { data: list, error: listError } = await admin.auth.admin.listUsers({
      page,
      perPage: 200,
    });

    if (listError) {
      console.error("listUsers failed:", listError.message);
      return null;
    }

    const match = list.users.find(
      (entry) => entry.email?.toLowerCase() === normalized
    );
    if (match) return match.id;
    if (list.users.length < 200) return null;
  }

  return null;
}

export async function addOrganizationMember(
  input: unknown
): Promise<ActionResult<{ invited: boolean }>> {
  const parsed = addMemberSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { supabase, user } = await requireProfile();
  const { organizationId, email, role = "viewer" } = parsed.data;

  const { data: membership } = await supabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", organizationId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership || !canManageMembers(membership.role as OrgRole)) {
    return { ok: false, error: "You do not have permission to add members" };
  }

  let inviteeId: string | null = null;
  let invited = false;

  try {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const admin = createAdminClient();
    const siteUrl = await getSiteUrl();
    const { data: invitedUser, error: inviteError } =
      await admin.auth.admin.inviteUserByEmail(email, {
        redirectTo: `${siteUrl}/set-password`,
      });

    if (inviteError) {
      if (!isExistingAccountError(inviteError)) {
        console.error("inviteUserByEmail failed:", inviteError.message);
        const message = inviteError.message.toLowerCase();
        if (message.includes("rate limit")) {
          return {
            ok: false,
            error: "Too many invitation emails were sent. Wait a few minutes and try again.",
          };
        }
        return {
          ok: false,
          error:
            "Could not send the invitation email. Check that Supabase Auth email is enabled, then try again.",
        };
      }

      inviteeId = await findUserIdByEmail(email);
      if (!inviteeId) {
        return {
          ok: false,
          error:
            "That email already has an account, but it could not be added to this organization.",
        };
      }
    } else {
      inviteeId = invitedUser.user?.id ?? null;
      invited = true;
    }
  } catch (error) {
    console.error("Admin invite failed:", error);
    return {
      ok: false,
      error: "Member invites require SUPABASE_SERVICE_ROLE_KEY on the server",
    };
  }

  if (!inviteeId) {
    return { ok: false, error: "The invitation did not return a user." };
  }

  const { data: existingMember } = await supabase
    .from("organization_members")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("user_id", inviteeId)
    .maybeSingle();

  if (existingMember) {
    return { ok: false, error: "That user is already a member" };
  }

  const { error } = await supabase.from("organization_members").insert({
    organization_id: organizationId,
    user_id: inviteeId,
    role,
  });

  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "That user is already a member" };
    }
    console.error("addOrganizationMember failed:", error.message);
    if (invited) {
      return {
        ok: false,
        error:
          "The invitation email was sent, but they could not be added to the organization. Try again.",
      };
    }
    return { ok: false, error: "Could not add member" };
  }

  revalidatePath("/dashboard");
  return { ok: true, data: { invited } };
}

export async function updateMemberRole(
  input: unknown
): Promise<ActionResult> {
  const parsed = updateMemberRoleSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { supabase, user } = await requireProfile();
  const { organizationId, memberId, role } = parsed.data;

  const { data: actor } = await supabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", organizationId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!actor || !canManageMembers(actor.role as OrgRole)) {
    return { ok: false, error: "You do not have permission to change roles" };
  }

  const { data: target } = await supabase
    .from("organization_members")
    .select("id, role, user_id")
    .eq("id", memberId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (!target) {
    return { ok: false, error: "Member not found" };
  }

  if (target.role === "owner") {
    return { ok: false, error: "Owner role cannot be changed this way" };
  }

  const { error } = await supabase
    .from("organization_members")
    .update({ role })
    .eq("id", memberId);

  if (error) {
    console.error("updateMemberRole failed:", error.message);
    return { ok: false, error: "Could not update role" };
  }

  revalidatePath("/dashboard");
  return { ok: true, data: undefined };
}
