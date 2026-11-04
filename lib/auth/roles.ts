import type { OrgRole } from "@/lib/types/database";

export const ORG_ROLES: OrgRole[] = ["owner", "admin", "operator", "viewer"];

const WRITE_ROLES: OrgRole[] = ["owner", "admin"];

export function canManageOrganization(role: OrgRole): boolean {
  return WRITE_ROLES.includes(role);
}

export function canManageMembers(role: OrgRole): boolean {
  return WRITE_ROLES.includes(role);
}

export function canManageSites(role: OrgRole): boolean {
  return WRITE_ROLES.includes(role);
}

export function canDeleteOrganization(role: OrgRole): boolean {
  return role === "owner";
}

export function isElevatedRole(role: OrgRole): boolean {
  return role === "owner" || role === "admin";
}
