export type OrgRole = "owner" | "admin" | "operator" | "viewer";

export type SiteStatus = "active" | "inactive" | "maintenance";

export type Profile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
};

export type Organization = {
  id: string;
  name: string;
  slug: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type OrganizationMember = {
  id: string;
  organization_id: string;
  user_id: string;
  role: OrgRole;
  created_at: string;
};

export type Site = {
  id: string;
  organization_id: string;
  name: string;
  site_code: string | null;
  location: string | null;
  timezone: string | null;
  description: string | null;
  status: SiteStatus | string;
  created_at: string;
  updated_at: string;
};

export type OrganizationWithRole = Organization & {
  role: OrgRole;
};

export type DashboardContext = {
  userId: string;
  email: string;
  profile: Profile;
  organizations: OrganizationWithRole[];
  sites: Site[];
  selectedSite: Site | null;
  activeOrganization: OrganizationWithRole | null;
};
