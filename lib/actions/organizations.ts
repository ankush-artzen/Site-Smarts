"use server";

import { revalidatePath } from "next/cache";

import { canManageMembers, canManageOrganization } from "@/lib/auth/roles";
import { requireProfile } from "@/lib/auth/session";
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

export async function addOrganizationMember(
  input: unknown
): Promise<ActionResult> {
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

  try {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const admin = createAdminClient();
    const { data: list, error: listError } = await admin.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    });

    if (listError) {
      console.error("listUsers failed:", listError.message);
      return { ok: false, error: "Could not look up user by email" };
    }

    const match = list.users.find(
      (entry) => entry.email?.toLowerCase() === email.toLowerCase()
    );
    inviteeId = match?.id ?? null;
  } catch (error) {
    console.error("Admin lookup failed:", error);
    return {
      ok: false,
      error: "Member invites require SUPABASE_SERVICE_ROLE_KEY on the server",
    };
  }

  if (!inviteeId) {
    return {
      ok: false,
      error: "No Site Smarts user found with that email. They must sign in once first.",
    };
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
    return { ok: false, error: "Could not add member" };
  }

  revalidatePath("/dashboard");
  return { ok: true, data: undefined };
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
