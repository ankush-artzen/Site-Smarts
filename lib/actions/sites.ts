"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

import { canManageSites } from "@/lib/auth/roles";
import {
  listAccessibleSites,
  requireProfile,
  SELECTED_SITE_COOKIE,
} from "@/lib/auth/session";
import type { OrgRole, Site } from "@/lib/types/database";
import {
  createSiteSchema,
  setSelectedSiteSchema,
  updateSiteSchema,
} from "@/lib/validation/site";

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export async function createSite(input: unknown): Promise<ActionResult<Site>> {
  const parsed = createSiteSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { supabase, user } = await requireProfile();
  const {
    organizationId,
    name,
    siteCode,
    status,
    timezone,
    location,
    description,
  } = parsed.data;

  const { data: membership } = await supabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", organizationId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership || !canManageSites(membership.role as OrgRole)) {
    return { ok: false, error: "You do not have permission to create sites" };
  }

  const { data, error } = await supabase
    .from("sites")
    .insert({
      organization_id: organizationId,
      name,
      site_code: siteCode || null,
      status,
      timezone,
      location: location || null,
      description: description || null,
    })
    .select("*")
    .single();

  if (error) {
    console.error("createSite failed:", error.message);
    return { ok: false, error: error.message || "Could not create site" };
  }

  revalidatePath("/dashboard");
  return { ok: true, data: data as Site };
}

export async function updateSite(input: unknown): Promise<ActionResult<Site>> {
  const parsed = updateSiteSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { supabase, user } = await requireProfile();
  const { siteId, name, siteCode, status, timezone, location, description } =
    parsed.data;

  const { data: existing } = await supabase
    .from("sites")
    .select("id, organization_id")
    .eq("id", siteId)
    .maybeSingle();

  if (!existing) {
    return { ok: false, error: "Site not found" };
  }

  const { data: membership } = await supabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", existing.organization_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership || !canManageSites(membership.role as OrgRole)) {
    return { ok: false, error: "You do not have permission to update this site" };
  }

  const { data, error } = await supabase
    .from("sites")
    .update({
      name,
      site_code: siteCode || null,
      status,
      timezone,
      location: location || null,
      description: description || null,
    })
    .eq("id", siteId)
    .select("*")
    .single();

  if (error) {
    console.error("updateSite failed:", error.message);
    return { ok: false, error: "Could not update site" };
  }

  revalidatePath("/dashboard");
  return { ok: true, data: data as Site };
}

export async function setSelectedSite(
  input: unknown
): Promise<ActionResult> {
  const parsed = setSelectedSiteSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { supabase } = await requireProfile();
  const sites = await listAccessibleSites(supabase);
  const match = sites.find((site) => site.id === parsed.data.siteId);

  if (!match) {
    return { ok: false, error: "Site is not accessible" };
  }

  const cookieStore = await cookies();
  cookieStore.set(SELECTED_SITE_COOKIE, match.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  revalidatePath("/dashboard");
  return { ok: true, data: undefined };
}
