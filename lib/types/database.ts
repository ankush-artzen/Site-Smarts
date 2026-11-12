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

export type SiteDevice = {
  id: string;
  name: string;
  device_type: string;
  status: string;
  battery_voltage: number | null;
  last_seen_at: string | null;
};

export type SiteReading = {
  id: string;
  device_id: string;
  distance_mm: number | null;
  battery_voltage: number | null;
  rssi: number | null;
  snr: number | null;
  fill_percentage: number | null;
  volume_litres: number | null;
  received_at: string;
};

export type SiteTelemetry = {
  devices: SiteDevice[];
  readings: SiteReading[];
};

export type TankType = "water" | "wastewater";

export type Tank = {
  id: string;
  organization_id: string;
  site_id: string;
  sensor_device_id: string | null;
  name: string;
  tank_type: TankType;
  length_mm: number | null;
  width_mm: number | null;
  height_mm: number | null;
  sensor_mounting_height_mm: number | null;
  usable_capacity_l: number;
  dead_space_mm: number;
  low_level_threshold: number;
  high_level_threshold: number;
  calibration_offset_mm: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type TankSensor = {
  id: string;
  name: string;
  dev_eui: string | null;
  status: string;
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
