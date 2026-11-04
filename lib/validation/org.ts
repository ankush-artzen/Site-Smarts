import { z } from "zod";

export const createOrganizationSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Organization name is too short")
    .max(80, "Organization name is too long"),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Slug must be lowercase letters, numbers, and hyphens"
    )
    .min(2)
    .max(48),
});

export const updateOrganizationSchema = z.object({
  organizationId: z.string().uuid(),
  name: z.string().trim().min(2).max(80),
});

export const addMemberSchema = z.object({
  organizationId: z.string().uuid(),
  email: z.string().trim().email(),
  role: z.enum(["admin", "operator", "viewer"]).default("viewer"),
});

export const updateMemberRoleSchema = z.object({
  organizationId: z.string().uuid(),
  memberId: z.string().uuid(),
  role: z.enum(["admin", "operator", "viewer"]),
});

export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;
