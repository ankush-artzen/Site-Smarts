"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { createTank, updateTank } from "@/lib/actions/tanks";
import type { Tank, TankSensor, TankType } from "@/lib/types/database";

type TankSetupProps = {
  siteId: string;
  siteName: string;
  canEdit: boolean;
  tanks: Tank[];
  sensors: TankSensor[];
  loadError: string | null;
};

type TankFormState = {
  name: string;
  tankType: TankType;
  lengthMm: string;
  widthMm: string;
  heightMm: string;
  sensorMountingHeightMm: string;
  usableCapacityL: string;
  lowLevelPercent: string;
  highLevelPercent: string;
  sensorDeviceId: string;
  isActive: boolean;
};

const fieldClass =
  "w-full rounded-xl border border-border bg-surface-soft px-4 py-3 text-sm text-foreground outline-none transition focus:border-accent focus:bg-surface focus:ring-2 focus:ring-accent/20 disabled:cursor-not-allowed disabled:opacity-70";

function emptyForm(): TankFormState {
  return {
    name: "",
    tankType: "water",
    lengthMm: "",
    widthMm: "",
    heightMm: "",
    sensorMountingHeightMm: "",
    usableCapacityL: "",
    lowLevelPercent: "20",
    highLevelPercent: "90",
    sensorDeviceId: "",
    isActive: true,
  };
}

function numberInput(value: number | null) {
  return value == null ? "" : String(value);
}

function formFromTank(tank: Tank): TankFormState {
  return {
    name: tank.name,
    tankType: tank.tank_type,
    lengthMm: numberInput(tank.length_mm),
    widthMm: numberInput(tank.width_mm),
    heightMm: numberInput(tank.height_mm),
    sensorMountingHeightMm: numberInput(tank.sensor_mounting_height_mm),
    usableCapacityL: numberInput(tank.usable_capacity_l),
    lowLevelPercent: numberInput(tank.low_level_threshold),
    highLevelPercent: numberInput(tank.high_level_threshold),
    sensorDeviceId: tank.sensor_device_id ?? "",
    isActive: tank.is_active,
  };
}

function geometricLitres(form: TankFormState) {
  const length = Number(form.lengthMm);
  const width = Number(form.widthMm);
  const height = Number(form.heightMm);
  if (![length, width, height].every((value) => Number.isFinite(value) && value > 0)) {
    return null;
  }
  return (length * width * height) / 1_000_000;
}

function formatLitres(value: number) {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(value);
}

export function TankSetup({
  siteId,
  siteName,
  canEdit,
  tanks,
  sensors,
  loadError,
}: TankSetupProps) {
  const router = useRouter();
  const initialTank = canEdit ? null : (tanks[0] ?? null);
  const [tankId, setTankId] = useState<string | null>(initialTank?.id ?? null);
  const [form, setForm] = useState<TankFormState>(
    initialTank ? formFromTank(initialTank) : emptyForm
  );
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [pending, startTransition] = useTransition();

  const selected = tanks.find((tank) => tank.id === tankId) ?? null;
  const volume = geometricLitres(form);
  const sensorName = new Map(sensors.map((sensor) => [sensor.id, sensor.name]));

  function update<K extends keyof TankFormState>(key: K, value: TankFormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function startNew() {
    setTankId(null);
    setForm(emptyForm());
    setError("");
    setSuccess("");
  }

  function startEdit(tank: Tank) {
    setTankId(tank.id);
    setForm(formFromTank(tank));
    setError("");
    setSuccess("");
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canEdit) return;
    setError("");
    setSuccess("");

    const payload = {
      name: form.name,
      tankType: form.tankType,
      lengthMm: form.lengthMm,
      widthMm: form.widthMm,
      heightMm: form.heightMm,
      sensorMountingHeightMm: form.sensorMountingHeightMm,
      usableCapacityL: form.usableCapacityL,
      lowLevelPercent: form.lowLevelPercent,
      highLevelPercent: form.highLevelPercent,
      sensorDeviceId: form.sensorDeviceId || null,
      isActive: form.isActive,
    };

    startTransition(async () => {
      const result = tankId
        ? await updateTank({ ...payload, tankId })
        : await createTank({ ...payload, siteId });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      setTankId(result.data.id);
      setForm(formFromTank(result.data));
      setSuccess(tankId ? "Tank updated." : "Tank created.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <section className="animate-rise">
        <p className="text-sm text-muted">{siteName}</p>
        <h2 className="mt-1 font-display text-3xl font-semibold tracking-tight text-foreground">
          Tank setup
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
          Record the tank on this site: water or wastewater, inside dimensions,
          sensor mounting height, usable capacity, and the fill percentages
          that should raise an alert.
        </p>
      </section>

      {loadError ? (
        <p className="rounded-xl bg-danger-soft px-3 py-3 text-sm text-danger">
          {loadError}
        </p>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <aside className="rounded-2xl border border-border bg-surface p-4 shadow-[var(--shadow)]">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-display text-lg font-semibold text-foreground">
              Tanks
            </h3>
            {canEdit ? (
              <button
                type="button"
                onClick={startNew}
                className="rounded-lg bg-teal px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90"
              >
                New tank
              </button>
            ) : null}
          </div>

          {tanks.length === 0 ? (
            <p className="mt-4 text-sm text-muted">No tanks on this site yet.</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {tanks.map((tank) => {
                const active = tank.id === tankId;
                return (
                  <li key={tank.id}>
                    <button
                      type="button"
                      onClick={() => startEdit(tank)}
                      className={`w-full rounded-xl px-3 py-2.5 text-left transition ${
                        active
                          ? "bg-teal-soft text-foreground"
                          : "bg-surface-soft text-foreground hover:bg-teal-soft/60"
                      }`}
                    >
                      <span className="block text-sm font-medium">{tank.name}</span>
                      <span className="mt-1 block text-xs capitalize text-muted">
                        {tank.tank_type}
                        {" · "}
                        {formatLitres(tank.usable_capacity_l)} L
                        {tank.sensor_device_id
                          ? ` · ${sensorName.get(tank.sensor_device_id) ?? "Sensor"}`
                          : ""}
                        {tank.is_active ? "" : " · inactive"}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>

        <form
          onSubmit={onSubmit}
          className="space-y-5 rounded-2xl border border-border bg-surface p-5 shadow-[var(--shadow)] sm:p-6"
        >
          <div>
            <h3 className="font-display text-lg font-semibold text-foreground">
              {selected ? selected.name : "New tank"}
            </h3>
            <p className="mt-1 text-sm text-muted">
              {canEdit
                ? "Owners and admins can save changes for this site."
                : "You can view this setup. Owners and admins can edit it."}
            </p>
          </div>

          <Field label="Name" htmlFor="tank-name">
            <input
              id="tank-name"
              required
              disabled={!canEdit}
              value={form.name}
              onChange={(event) => update("name", event.target.value)}
              placeholder="Main water tank"
              className={fieldClass}
            />
          </Field>

          <Field label="Contents" htmlFor="tank-type">
            <select
              id="tank-type"
              disabled={!canEdit}
              value={form.tankType}
              onChange={(event) => update("tankType", event.target.value as TankType)}
              className={fieldClass}
            >
              <option value="water">Water</option>
              <option value="wastewater">Wastewater</option>
            </select>
          </Field>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Length (mm)" htmlFor="tank-length">
              <input
                id="tank-length"
                required
                disabled={!canEdit}
                inputMode="decimal"
                value={form.lengthMm}
                onChange={(event) => update("lengthMm", event.target.value)}
                className={fieldClass}
              />
            </Field>
            <Field label="Width (mm)" htmlFor="tank-width">
              <input
                id="tank-width"
                required
                disabled={!canEdit}
                inputMode="decimal"
                value={form.widthMm}
                onChange={(event) => update("widthMm", event.target.value)}
                className={fieldClass}
              />
            </Field>
            <Field label="Height (mm)" htmlFor="tank-height">
              <input
                id="tank-height"
                required
                disabled={!canEdit}
                inputMode="decimal"
                value={form.heightMm}
                onChange={(event) => update("heightMm", event.target.value)}
                className={fieldClass}
              />
            </Field>
          </div>

          <Field
            label="Sensor mounting height (mm)"
            htmlFor="tank-mount"
            hint="Distance from the tank floor to the sensor face."
          >
            <input
              id="tank-mount"
              required
              disabled={!canEdit}
              inputMode="decimal"
              value={form.sensorMountingHeightMm}
              onChange={(event) => update("sensorMountingHeightMm", event.target.value)}
              className={fieldClass}
            />
          </Field>

          <Field
            label="Usable capacity (L)"
            htmlFor="tank-capacity"
            hint={
              volume == null
                ? "Litres the site can actually use."
                : `Rectangular volume from these dimensions is ${formatLitres(volume)} L.`
            }
          >
            <input
              id="tank-capacity"
              required
              disabled={!canEdit}
              inputMode="decimal"
              value={form.usableCapacityL}
              onChange={(event) => update("usableCapacityL", event.target.value)}
              className={fieldClass}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Low alert (%)" htmlFor="tank-low" hint="Percent of usable capacity.">
              <input
                id="tank-low"
                required
                disabled={!canEdit}
                inputMode="decimal"
                value={form.lowLevelPercent}
                onChange={(event) => update("lowLevelPercent", event.target.value)}
                className={fieldClass}
              />
            </Field>
            <Field label="High alert (%)" htmlFor="tank-high" hint="Percent of usable capacity.">
              <input
                id="tank-high"
                required
                disabled={!canEdit}
                inputMode="decimal"
                value={form.highLevelPercent}
                onChange={(event) => update("highLevelPercent", event.target.value)}
                className={fieldClass}
              />
            </Field>
          </div>

          <Field
            label="Sensor"
            htmlFor="tank-sensor"
            hint="Link the ultrasonic sensor mounted on this tank. One active tank per sensor."
          >
            <select
              id="tank-sensor"
              disabled={!canEdit}
              value={form.sensorDeviceId}
              onChange={(event) => update("sensorDeviceId", event.target.value)}
              className={fieldClass}
            >
              <option value="">Not linked</option>
              {sensors.map((sensor) => {
                const taken = tanks.some(
                  (tank) =>
                    tank.is_active &&
                    tank.sensor_device_id === sensor.id &&
                    tank.id !== tankId
                );
                return (
                  <option key={sensor.id} value={sensor.id} disabled={taken}>
                    {sensor.name}
                    {sensor.dev_eui ? ` · ${sensor.dev_eui}` : ""}
                    {taken ? " (linked)" : ""}
                  </option>
                );
              })}
            </select>
          </Field>

          <label className="flex items-start gap-3 text-sm text-foreground">
            <input
              type="checkbox"
              disabled={!canEdit}
              checked={form.isActive}
              onChange={(event) => update("isActive", event.target.checked)}
              className="mt-0.5 h-4 w-4 accent-teal"
            />
            <span>
              Active
              <span className="mt-1 block text-xs text-muted">
                Inactive tanks stay on record. New readings are linked only to
                the active tank on a sensor.
              </span>
            </span>
          </label>

          {error ? (
            <p className="rounded-xl bg-danger-soft px-3 py-3 text-sm text-danger">
              {error}
            </p>
          ) : null}

          {success ? (
            <p className="rounded-xl bg-teal-soft px-3 py-3 text-sm text-teal">
              {success}
            </p>
          ) : null}

          {canEdit ? (
            <button
              type="submit"
              disabled={pending}
              className="rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-white transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending ? "Saving..." : tankId ? "Save tank" : "Create tank"}
            </button>
          ) : null}
        </form>
      </section>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-2 block text-sm font-medium text-foreground">
        {label}
      </label>
      {children}
      {hint ? <p className="mt-2 text-xs leading-5 text-muted">{hint}</p> : null}
    </div>
  );
}
