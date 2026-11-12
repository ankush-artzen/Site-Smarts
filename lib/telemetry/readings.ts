import { createClient } from "@/lib/supabase/server";
import type { SiteDevice, SiteReading, SiteTelemetry } from "@/lib/types/database";

const READING_LIMIT = 500;

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export async function getSiteTelemetry(siteId: string): Promise<SiteTelemetry> {
  const supabase = await createClient();

  const [devicesResult, readingsResult] = await Promise.all([
    supabase
      .from("devices")
      .select("id, name, device_type, status, battery_voltage, last_seen_at")
      .eq("site_id", siteId)
      .order("name", { ascending: true }),
    supabase
      .from("sensor_readings")
      .select(
        "id, device_id, distance_mm, battery_voltage, rssi, snr, fill_percentage, volume_litres, received_at"
      )
      .eq("site_id", siteId)
      .order("received_at", { ascending: false })
      .limit(READING_LIMIT),
  ]);

  if (devicesResult.error) {
    console.error("Failed to load devices:", devicesResult.error.message);
  }

  if (readingsResult.error) {
    console.error("Failed to load sensor readings:", readingsResult.error.message);
  }

  const devices: SiteDevice[] = (devicesResult.data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    device_type: row.device_type,
    status: row.status,
    battery_voltage: toNumber(row.battery_voltage),
    last_seen_at: row.last_seen_at,
  }));

  const readings: SiteReading[] = (readingsResult.data ?? []).map((row) => ({
    id: row.id,
    device_id: row.device_id,
    distance_mm: toNumber(row.distance_mm),
    battery_voltage: toNumber(row.battery_voltage),
    rssi: toNumber(row.rssi),
    snr: toNumber(row.snr),
    fill_percentage: toNumber(row.fill_percentage),
    volume_litres: toNumber(row.volume_litres),
    received_at: row.received_at,
  }));

  return { devices, readings };
}
