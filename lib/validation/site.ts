import { z } from "zod";

// Live DB check constraint sites_status_check allows only these values.
export const siteStatusSchema = z.enum([
  "active",
  "inactive",
  "maintenance",
]);

export const createSiteSchema = z.object({
  organizationId: z.string().uuid(),
  name: z.string().trim().min(2).max(120),
  siteCode: z.string().trim().max(32).optional().nullable(),
  status: siteStatusSchema.default("active"),
  timezone: z.string().trim().min(1).max(64).default("UTC"),
  location: z.string().trim().max(160).optional().nullable(),
  description: z.string().trim().max(500).optional().nullable(),
});

export const updateSiteSchema = createSiteSchema
  .omit({ organizationId: true })
  .extend({
    siteId: z.string().uuid(),
  });

export const setSelectedSiteSchema = z.object({
  siteId: z.string().uuid(),
});

export type CreateSiteInput = z.infer<typeof createSiteSchema>;
