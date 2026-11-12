"use client";

import Link from "next/link";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Antenna, Battery, Ruler, Signal } from "lucide-react";

import { CreateOrganizationForm } from "@/components/create-organization-form";
import { CreateSiteForm } from "@/components/create-site-form";
import { InviteMemberForm } from "@/components/invite-member-form";
import { canManageMembers, canManageSites } from "@/lib/auth/roles";
import type {
  OrganizationWithRole,
  Site,
  SiteDevice,
  SiteReading,
} from "@/lib/types/database";

const seriesColors = ["#c46f08", "#7dcec4"];

type DashboardOverviewProps = {
  email: string;
  profileName?: string | null;
  organizations: OrganizationWithRole[];
  sites: Site[];
  selectedSite: Site | null;
  activeOrganization: OrganizationWithRole | null;
  devices: SiteDevice[];
  readings: SiteReading[];
};

type ChartRow = {
  time: string;
  label: string;
  [series: string]: string | number | null;
};

function formatMillimetres(value: number | null) {
  if (value == null) return "—";
  return `${new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 0,
  }).format(value)} mm`;
}

function formatVolts(value: number | null) {
  if (value == null) return "—";
  return `${value.toFixed(2)} V`;
}

function formatRssi(value: number | null) {
  if (value == null) return "—";
  const rounded = Number.isInteger(value) ? String(value) : value.toFixed(1);
  return `${rounded} dBm`;
}

function formatWhen(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatTick(iso: string, sameDay: boolean) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString(
    undefined,
    sameDay
      ? { hour: "2-digit", minute: "2-digit" }
      : { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }
  );
}

function latestForDevice(readings: SiteReading[], deviceId: string) {
  return readings.find((reading) => reading.device_id === deviceId) ?? null;
}

function buildChart(devices: SiteDevice[], readings: SiteReading[]) {
  const nameById = new Map(devices.map((device) => [device.id, device.name]));
  const usedNames = new Map<string, number>();
  const seriesName = (deviceId: string) => {
    const base = nameById.get(deviceId) ?? "Sensor";
    const seen = usedNames.get(base) ?? 0;
    usedNames.set(base, seen + 1);
    return seen === 0 ? base : `${base} ${seen + 1}`;
  };
  const seriesByDevice = new Map<string, string>();

  const rowsByTime = new Map<string, ChartRow>();
  for (const reading of [...readings].reverse()) {
    if (reading.distance_mm == null) continue;
    const series =
      seriesByDevice.get(reading.device_id) ?? seriesName(reading.device_id);
    seriesByDevice.set(reading.device_id, series);

    const row = rowsByTime.get(reading.received_at) ?? {
      time: reading.received_at,
      label: reading.received_at,
    };
    row[series] = reading.distance_mm;
    rowsByTime.set(reading.received_at, row);
  }

  const rows = [...rowsByTime.values()];
  const first = rows[0]?.time;
  const last = rows[rows.length - 1]?.time;
  const sameDay =
    !!first &&
    !!last &&
    new Date(first).toDateString() === new Date(last).toDateString();

  for (const row of rows) {
    row.label = formatTick(row.time, sameDay);
  }

  const distances = rows.flatMap((row) =>
    [...seriesByDevice.values()]
      .map((series) => row[series])
      .filter((value): value is number => typeof value === "number")
  );
  const min = Math.min(...distances);
  const max = Math.max(...distances);
  const pad = Math.max(20, (max - min) * 0.2 || 20);

  return {
    rows,
    series: [...seriesByDevice.values()],
    domain: [min - pad, max + pad] as [number, number],
  };
}

export function DashboardOverview({
  email,
  profileName,
  organizations,
  sites,
  selectedSite,
  activeOrganization,
  devices,
  readings,
}: DashboardOverviewProps) {
  const name =
    profileName?.split(" ")[0] ||
    email.split("@")[0] ||
    "operator";

  if (organizations.length === 0) {
    return (
      <div className="animate-rise space-y-6">
        <section>
          <p className="text-sm text-muted">Welcome, {name}</p>
          <h2 className="mt-1 font-display text-3xl font-semibold tracking-tight text-foreground">
            Set up your workspace
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            You are signed in securely. Create an organization to own Solarshed
            sites. Dashboard data stays empty until you belong to an org.
          </p>
        </section>
        <CreateOrganizationForm />
      </div>
    );
  }

  const canCreateSites =
    !!activeOrganization && canManageSites(activeOrganization.role);
  const canInvite =
    !!activeOrganization && canManageMembers(activeOrganization.role);

  const latest = readings[0] ?? null;
  const latestDevice = devices.find((device) => device.id === latest?.device_id);
  const onlineCount = devices.filter((device) => device.status === "online").length;
  const chart = buildChart(devices, readings);
  const distanceValue =
    latest?.fill_percentage != null
      ? `${latest.fill_percentage.toFixed(0)}%`
      : formatMillimetres(latest?.distance_mm ?? null);
  const distanceDetail = latest
    ? latest.fill_percentage != null
      ? `${formatMillimetres(latest.distance_mm)} · ${latestDevice?.name ?? "Sensor"}`
      : `${latestDevice?.name ?? "Sensor"} · ${formatWhen(latest.received_at)}`
    : "No readings for this site yet";
  const batteryValue = formatVolts(
    latest?.battery_voltage ?? latestDevice?.battery_voltage ?? null
  );
  const signalDetail =
    latest?.snr != null ? `SNR ${latest.snr.toFixed(1)}` : "No signal sample yet";

  const metrics = [
    {
      label: latest?.fill_percentage != null ? "Fill level" : "Distance",
      value: distanceValue,
      detail: distanceDetail,
      icon: Ruler,
    },
    {
      label: "Sensor battery",
      value: batteryValue,
      detail: latest ? "From the latest uplink" : "No battery sample yet",
      icon: Battery,
    },
    {
      label: "Signal",
      value: formatRssi(latest?.rssi ?? null),
      detail: signalDetail,
      icon: Signal,
    },
    {
      label: "Sensors",
      value: devices.length === 0 ? "—" : `${onlineCount} online`,
      detail:
        devices.length === 0
          ? "No sensors on this site"
          : `${devices.length} on this site`,
      icon: Antenna,
    },
  ];

  return (
    <div className="space-y-8">
      <section className="animate-rise">
        <p className="text-sm text-muted">Welcome back</p>
        <h2 className="mt-1 font-display text-3xl font-semibold capitalize tracking-tight text-foreground">
          {name}
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
          {activeOrganization
            ? `${activeOrganization.name} · role ${activeOrganization.role}`
            : "Site Smarts is ready for your portfolio."}
          {selectedSite ? ` · viewing ${selectedSite.name}` : ""}
        </p>
      </section>

      <section className="animate-rise-delay grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <article
              key={metric.label}
              className="rounded-2xl border border-border bg-surface p-5 shadow-[var(--shadow)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.14em] text-muted">
                    {metric.label}
                  </p>
                  <p className="mt-3 font-display text-2xl font-semibold text-foreground">
                    {metric.value}
                  </p>
                  <p className="mt-2 text-sm text-muted">{metric.detail}</p>
                </div>
                <div className="rounded-xl bg-surface-soft p-2.5 text-teal">
                  <Icon className="h-5 w-5" />
                </div>
              </div>
            </article>
          );
        })}
      </section>

      <section className="animate-rise-delay-2 grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <article className="rounded-2xl border border-border bg-surface p-5 shadow-[var(--shadow)] sm:p-6">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <h3 className="font-display text-lg font-semibold text-foreground">
                Distance
              </h3>
              <p className="mt-1 text-sm text-muted">
                Millimetres from each sensor to the surface.
              </p>
            </div>
            <p className="text-sm font-medium text-accent-strong">mm</p>
          </div>

          <div className="h-64 w-full">
            {chart.rows.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted">
                No distance readings for this site yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chart.rows}>
                  <defs>
                    {chart.series.map((series, index) => (
                      <linearGradient
                        key={series}
                        id={`distanceFill-${index}`}
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor={seriesColors[index % seriesColors.length]}
                          stopOpacity={0.35}
                        />
                        <stop
                          offset="95%"
                          stopColor={seriesColors[index % seriesColors.length]}
                          stopOpacity={0.02}
                        />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid stroke="#d4dee5" strokeDasharray="4 8" />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: "#5b6b75", fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "#5b6b75", fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                    width={48}
                    domain={chart.domain}
                  />
                  <Tooltip
                    formatter={(value) => [
                      typeof value === "number" ? formatMillimetres(value) : "—",
                      "Distance",
                    ]}
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid #d4dee5",
                      boxShadow: "0 12px 30px rgba(11,31,42,0.08)",
                    }}
                  />
                  {chart.series.length > 1 ? <Legend /> : null}
                  {chart.series.map((series, index) => (
                    <Area
                      key={series}
                      type="monotone"
                      dataKey={series}
                      name={series}
                      stroke={seriesColors[index % seriesColors.length]}
                      strokeWidth={2.5}
                      fill={`url(#distanceFill-${index})`}
                      connectNulls
                      dot={{ r: 3 }}
                    />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </article>

        <article className="rounded-2xl border border-border bg-[linear-gradient(160deg,#0b1f2a_0%,#1f7a6c_120%)] p-6 text-white shadow-[var(--shadow)]">
          <p className="text-xs uppercase tracking-[0.16em] text-white/60">
            {devices.length > 0 ? "Sensors" : "Portfolio snapshot"}
          </p>
          <h3 className="mt-3 font-display text-2xl font-semibold">
            {devices.length > 0
              ? `${devices.length} sensor${devices.length === 1 ? "" : "s"}`
              : sites.length === 0
                ? "No sites yet"
                : `${sites.length} site${sites.length === 1 ? "" : "s"} in view`}
          </h3>
          <p className="mt-3 text-sm leading-6 text-white/75">
            {devices.length > 0
              ? `Latest reading on ${selectedSite?.name ?? "this site"}. Fill level appears after a tank is linked. `
              : "Sites are loaded from your organization membership. "}
            {selectedSite ? (
              <Link href="/dashboard/tanks" className="font-semibold text-amber-200 underline">
                Tank setup
              </Link>
            ) : null}
          </p>

          {devices.length > 0 ? (
            <ul className="mt-8 space-y-3 text-sm">
              {devices.map((device) => {
                const reading = latestForDevice(readings, device.id);
                return (
                  <li
                    key={device.id}
                    className="rounded-xl bg-white/8 px-3 py-2.5"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span>{device.name}</span>
                      <span className="text-xs text-amber-200">
                        {reading
                          ? formatMillimetres(reading.distance_mm)
                          : "No reading"}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-white/60">
                      {formatVolts(reading?.battery_voltage ?? device.battery_voltage)}
                      {" · "}
                      <span className="capitalize">{device.status}</span>
                      {reading ? ` · ${formatWhen(reading.received_at)}` : ""}
                    </p>
                  </li>
                );
              })}
            </ul>
          ) : sites.length > 0 ? (
            <ul className="mt-8 space-y-3 text-sm">
              {sites.map((site) => (
                <li
                  key={site.id}
                  className="flex items-center justify-between rounded-xl bg-white/8 px-3 py-2.5"
                >
                  <span>{site.name}</span>
                  <span className="text-xs capitalize text-amber-200">
                    {site.status}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-8 text-sm text-white/70">
              Create your first site to start portfolio monitoring.
            </p>
          )}
        </article>
      </section>

      {canCreateSites && activeOrganization ? (
        <section className="animate-rise-delay-2 max-w-xl">
          <CreateSiteForm
            organizationId={activeOrganization.id}
            organizationName={activeOrganization.name}
          />
        </section>
      ) : null}

      {canInvite && activeOrganization ? (
        <section className="max-w-xl">
          <InviteMemberForm
            organizationId={activeOrganization.id}
            organizationName={activeOrganization.name}
          />
        </section>
      ) : null}
    </div>
  );
}
