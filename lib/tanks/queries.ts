import { createClient } from "@/lib/supabase/server";
import type { Tank, TankSensor } from "@/lib/types/database";

import { toTank, toTankSensor } from "@/lib/tanks/map";

const tankColumns =
  "id, organization_id, site_id, sensor_device_id, name, tank_type, length_mm, width_mm, height_mm, sensor_mounting_height_mm, usable_capacity_l, dead_space_mm, low_level_threshold, high_level_threshold, calibration_offset_mm, is_active, created_at, updated_at";

export async function getTankSetup(siteId: string): Promise<{
  tanks: Tank[];
  sensors: TankSensor[];
  error: string | null;
}> {
  const supabase = await createClient();

  const [tanksResult, sensorsResult] = await Promise.all([
    supabase
      .from("tanks")
      .select(tankColumns)
      .eq("site_id", siteId)
      .order("name", { ascending: true }),
    supabase
      .from("devices")
      .select("id, name, dev_eui, status")
      .eq("site_id", siteId)
      .order("name", { ascending: true }),
  ]);

  if (tanksResult.error) {
    console.error("Failed to load tanks:", tanksResult.error.message);
  }

  if (sensorsResult.error) {
    console.error("Failed to load sensors:", sensorsResult.error.message);
  }

  return {
    tanks: (tanksResult.data ?? []).map((row) => toTank(row)),
    sensors: (sensorsResult.data ?? []).map((row) => toTankSensor(row)),
    error:
      tanksResult.error || sensorsResult.error
        ? "Could not load tank setup for this site"
        : null,
  };
}
