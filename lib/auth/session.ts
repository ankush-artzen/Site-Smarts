import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import type {
  DashboardContext,
  OrganizationWithRole,
  Profile,
  Site,
} from "@/lib/types/database";

export const SELECTED_SITE_COOKIE = "ss_selected_site_id";

export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/login");
  }

  return { supabase, user };
}

export async function getCurrentProfile(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("Failed to load profile:", error.message);
    return null;
  }

  return data as Profile | null;
}

export async function requireProfile(): Promise<{
  supabase: Awaited<ReturnType<typeof createClient>>;
  user: { id: string; email?: string | null; user_metadata?: Record<string, unknown> };
  profile: Profile;
}> {
  const { supabase, user } = await requireUser();
  let profile = await getCurrentProfile(supabase, user.id);

  // Self-heal if trigger missed an older account
  if (!profile) {
    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      full_name:
        typeof user.user_metadata?.full_name === "string"
          ? user.user_metadata.full_name
          : null,
    });

    if (error) {
      console.error("Failed to upsert profile:", error.message);
    } else {
      profile = await getCurrentProfile(supabase, user.id);
    }
  }

  if (!profile) {
    redirect("/login?error=profile_missing");
  }

  return { supabase, user, profile };
}

export async function listOrganizationsForUser(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<OrganizationWithRole[]> {
  const { data, error } = await supabase
    .from("organization_members")
    .select(
      `
      role,
      organizations (
        id,
        name,
        slug,
        created_by,
        created_at,
        updated_at
      )
    `
    )
    .eq("user_id", userId);

  if (error) {
    console.error("Failed to load organizations:", error.message);
    return [];
  }

  return (data ?? [])
    .map((row) => {
      const org = row.organizations;
      if (!org || Array.isArray(org)) return null;
      return {
        ...(org as Omit<OrganizationWithRole, "role">),
        role: row.role as OrganizationWithRole["role"],
      };
    })
    .filter((value): value is OrganizationWithRole => value !== null);
}

export async function listAccessibleSites(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<Site[]> {
  const { data, error } = await supabase
    .from("sites")
    .select("*")
    .neq("status", "inactive")
    .order("name", { ascending: true });

  if (error) {
    console.error("Failed to load sites:", error.message);
    return [];
  }

  return (data ?? []) as Site[];
}

export async function getSelectedSiteId(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(SELECTED_SITE_COOKIE)?.value ?? null;
}

export async function resolveSelectedSite(
  sites: Site[],
  preferredId?: string | null
): Promise<Site | null> {
  if (sites.length === 0) return null;

  const cookieId = preferredId ?? (await getSelectedSiteId());
  if (cookieId) {
    const match = sites.find((site) => site.id === cookieId);
    if (match) return match;
  }

  return sites[0] ?? null;
}

export const getDashboardContext = cache(
  async (): Promise<DashboardContext> => {
    const { supabase, user, profile } = await requireProfile();
    const organizations = await listOrganizationsForUser(supabase, user.id);
    const sites = await listAccessibleSites(supabase);
    const selectedSite = await resolveSelectedSite(sites);

    const activeOrganization =
      organizations.find((org) => org.id === selectedSite?.organization_id) ??
      organizations[0] ??
      null;

    return {
      userId: user.id,
      email: user.email || "",
      profile,
      organizations,
      sites,
      selectedSite,
      activeOrganization,
    };
  }
);
