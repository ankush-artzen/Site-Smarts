"use server";

import { revalidatePath } from "next/cache";

import { canManageSites } from "@/lib/auth/roles";
import { requireProfile } from "@/lib/auth/session";
import { toTank } from "@/lib/tanks/map";
import type { OrgRole, Tank } from "@/lib/types/database";
import { createTankSchema, updateTankSchema } from "@/lib/validation/tank";

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string };

const tankColumns =
  "id, organization_id, site_id, sensor_device_id, name, tank_type, length_mm, width_mm, height_mm, sensor_mounting_height_mm, usable_capacity_l, dead_space_mm, low_level_threshold, high_level_threshold, calibration_offset_mm, is_active, created_at, updated_at";

type TankWrite = {
  name: string;
  tankType: "water" | "wastewater";
  lengthMm: number;
  widthMm: number;
  heightMm: number;
  sensorMountingHeightMm: number;
  usableCapacityL: number;
  lowLevelPercent: number;
  highLevelPercent: number;
  sensorDeviceId: string | null;
  isActive: boolean;
};

function saveError(error: { code?: string; message: string }) {
  console.error("Tank save failed:", error.message);

  if (error.code === "23505") {
    return "That sensor is already linked to an active tank";
  }

  if (error.code === "23514") {
    return "Check the tank type, dimensions, capacity, and alert percentages";
  }

  if (
    error.code === "42501" ||
    error.message.toLowerCase().includes("row-level security")
  ) {
    return "You do not have permission to save tanks. Apply supabase/migrations/20261111_tanks.sql if this is a new database.";
  }

  return "Could not save tank";
}

async function assertCanEditSite(
  supabase: Awaited<ReturnType<typeof requireProfile>>["supabase"],
  userId: string,
  siteId: string
) {
  const { data: site } = await supabase
    .from("sites")
    .select("id, organization_id")
    .eq("id", siteId)
    .maybeSingle();

  if (!site) {
    return { ok: false as const, error: "Site not found" };
  }

  const { data: membership } = await supabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", site.organization_id)
    .eq("user_id", userId)
    .maybeSingle();

  if (!membership || !canManageSites(membership.role as OrgRole)) {
    return { ok: false as const, error: "You do not have permission to edit tanks" };
  }

  return { ok: true as const, site };
}

async function assertSensorAvailable(
  supabase: Awaited<ReturnType<typeof requireProfile>>["supabase"],
  siteId: string,
  sensorDeviceId: string | null,
  isActive: boolean,
  tankId?: string
) {
  if (!sensorDeviceId) return { ok: true as const };

  const { data: device } = await supabase
    .from("devices")
    .select("id, site_id")
    .eq("id", sensorDeviceId)
    .maybeSingle();

  if (!device || device.site_id !== siteId) {
    return { ok: false as const, error: "Choose a sensor on this site" };
  }

  if (!isActive) return { ok: true as const };

  let query = supabase
    .from("tanks")
    .select("id, name")
    .eq("sensor_device_id", sensorDeviceId)
    .eq("is_active", true);

  if (tankId) {
    query = query.neq("id", tankId);
  }

  const { data: others, error } = await query;

  if (error) {
    console.error("Tank sensor check failed:", error.message);
    return { ok: false as const, error: "Could not check the linked sensor" };
  }

  if ((others ?? []).length > 0) {
    return {
      ok: false as const,
      error: `${others?.[0]?.name ?? "Another tank"} already uses this sensor`,
    };
  }

  return { ok: true as const };
}

function tankRow(siteId: string, organizationId: string, input: TankWrite) {
  return {
    organization_id: organizationId,
    site_id: siteId,
    name: input.name,
    tank_type: input.tankType,
    length_mm: input.lengthMm,
    width_mm: input.widthMm,
    height_mm: input.heightMm,
    sensor_mounting_height_mm: input.sensorMountingHeightMm,
    usable_capacity_l: input.usableCapacityL,
    low_level_threshold: input.lowLevelPercent,
    high_level_threshold: input.highLevelPercent,
    sensor_device_id: input.sensorDeviceId,
    is_active: input.isActive,
  };
}

export async function createTank(input: unknown): Promise<ActionResult<Tank>> {
  const parsed = createTankSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { supabase, user } = await requireProfile();
  const access = await assertCanEditSite(supabase, user.id, parsed.data.siteId);
  if (!access.ok) return access;

  const sensor = await assertSensorAvailable(
    supabase,
    access.site.id,
    parsed.data.sensorDeviceId,
    parsed.data.isActive
  );
  if (!sensor.ok) return sensor;

  const { data, error } = await supabase
    .from("tanks")
    .insert(tankRow(access.site.id, access.site.organization_id, parsed.data))
    .select(tankColumns)
    .single();

  if (error) {
    return { ok: false, error: saveError(error) };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/tanks");
  return { ok: true, data: toTank(data) };
}

export async function updateTank(input: unknown): Promise<ActionResult<Tank>> {
  const parsed = updateTankSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { supabase, user } = await requireProfile();
  const { data: existing } = await supabase
    .from("tanks")
    .select("id, site_id, organization_id")
    .eq("id", parsed.data.tankId)
    .maybeSingle();

  if (!existing) {
    return { ok: false, error: "Tank not found" };
  }

  const access = await assertCanEditSite(supabase, user.id, existing.site_id);
  if (!access.ok) return access;

  const sensor = await assertSensorAvailable(
    supabase,
    existing.site_id,
    parsed.data.sensorDeviceId,
    parsed.data.isActive,
    existing.id
  );
  if (!sensor.ok) return sensor;

  const { data, error } = await supabase
    .from("tanks")
    .update({
      ...tankRow(existing.site_id, existing.organization_id, parsed.data),
      updated_at: new Date().toISOString(),
    })
    .eq("id", existing.id)
    .select(tankColumns)
    .single();

  if (error) {
    return { ok: false, error: saveError(error) };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/tanks");
  return { ok: true, data: toTank(data) };
}
