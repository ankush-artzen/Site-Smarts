import type { Tank, TankSensor, TankType } from "@/lib/types/database";

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function tankType(value: unknown): TankType {
  return value === "wastewater" ? "wastewater" : "water";
}

export function toTank(row: {
  id: string;
  organization_id: string;
  site_id: string;
  sensor_device_id: string | null;
  name: string;
  tank_type: string;
  length_mm: unknown;
  width_mm: unknown;
  height_mm: unknown;
  sensor_mounting_height_mm: unknown;
  usable_capacity_l: unknown;
  dead_space_mm: unknown;
  low_level_threshold: unknown;
  high_level_threshold: unknown;
  calibration_offset_mm: unknown;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}): Tank {
  return {
    id: row.id,
    organization_id: row.organization_id,
    site_id: row.site_id,
    sensor_device_id: row.sensor_device_id,
    name: row.name,
    tank_type: tankType(row.tank_type),
    length_mm: toNumber(row.length_mm),
    width_mm: toNumber(row.width_mm),
    height_mm: toNumber(row.height_mm),
    sensor_mounting_height_mm: toNumber(row.sensor_mounting_height_mm),
    usable_capacity_l: toNumber(row.usable_capacity_l) ?? 0,
    dead_space_mm: toNumber(row.dead_space_mm) ?? 0,
    low_level_threshold: toNumber(row.low_level_threshold) ?? 20,
    high_level_threshold: toNumber(row.high_level_threshold) ?? 90,
    calibration_offset_mm: toNumber(row.calibration_offset_mm) ?? 0,
    is_active: row.is_active,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function toTankSensor(row: {
  id: string;
  name: string;
  dev_eui: string | null;
  status: string;
}): TankSensor {
  return {
    id: row.id,
    name: row.name,
    dev_eui: row.dev_eui,
    status: row.status,
  };
}
