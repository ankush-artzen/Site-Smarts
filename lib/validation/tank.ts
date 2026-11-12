import { z } from "zod";

export const tankTypeSchema = z.enum(["water", "wastewater"]);

const millimetres = z.coerce
  .number()
  .positive("Enter a measurement greater than zero")
  .max(100_000, "Enter a measurement of 100000 mm or less");

const percent = z.coerce
  .number()
  .min(0, "Alert percentage must be from 0 to 100")
  .max(100, "Alert percentage must be from 0 to 100");

const tankFields = z.object({
  name: z.string().trim().min(2, "Enter a tank name").max(120),
  tankType: tankTypeSchema,
  lengthMm: millimetres,
  widthMm: millimetres,
  heightMm: millimetres,
  sensorMountingHeightMm: millimetres,
  usableCapacityL: z.coerce
    .number()
    .positive("Enter a usable capacity greater than zero")
    .max(10_000_000, "Usable capacity is too large"),
  lowLevelPercent: percent,
  highLevelPercent: percent,
  sensorDeviceId: z.string().uuid().nullable(),
  isActive: z.boolean(),
});

function alertOrder(value: { lowLevelPercent: number; highLevelPercent: number }) {
  return value.lowLevelPercent < value.highLevelPercent;
}

export const createTankSchema = tankFields
  .extend({
    siteId: z.string().uuid(),
  })
  .refine(alertOrder, { message: "Low alert must be below the high alert" });

export const updateTankSchema = tankFields
  .extend({
    tankId: z.string().uuid(),
  })
  .refine(alertOrder, { message: "Low alert must be below the high alert" });
