"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BatteryCharging, Gauge, SunMedium, Zap } from "lucide-react";

import { CreateOrganizationForm } from "@/components/create-organization-form";
import { CreateSiteForm } from "@/components/create-site-form";
import { InviteMemberForm } from "@/components/invite-member-form";
import { canManageMembers, canManageSites } from "@/lib/auth/roles";
import type {
  OrganizationWithRole,
  Site,
} from "@/lib/types/database";

const production = [
  { hour: "06:00", kw: 12 },
  { hour: "08:00", kw: 48 },
  { hour: "10:00", kw: 96 },
  { hour: "12:00", kw: 132 },
  { hour: "14:00", kw: 118 },
  { hour: "16:00", kw: 74 },
  { hour: "18:00", kw: 28 },
];

const metrics = [
  {
    label: "Live output",
    value: "—",
    detail: "Telemetry not connected yet",
    icon: Zap,
  },
  {
    label: "Today yield",
    value: "—",
    detail: "Waiting on site ingest",
    icon: SunMedium,
  },
  {
    label: "Plant efficiency",
    value: "—",
    detail: "Sample metrics disabled",
    icon: Gauge,
  },
  {
    label: "Storage state",
    value: "—",
    detail: "No storage feed yet",
    icon: BatteryCharging,
  },
];

type DashboardOverviewProps = {
  email: string;
  profileName?: string | null;
  organizations: OrganizationWithRole[];
  sites: Site[];
  selectedSite: Site | null;
  activeOrganization: OrganizationWithRole | null;
};

export function DashboardOverview({
  email,
  profileName,
  organizations,
  sites,
  selectedSite,
  activeOrganization,
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
                Production curve
              </h3>
              <p className="mt-1 text-sm text-muted">
                Sample day profile while live telemetry connects.
              </p>
            </div>
            <p className="text-sm font-medium text-accent-strong">kW</p>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={production}>
                <defs>
                  <linearGradient id="kwFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#e08a12" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#e08a12" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#d4dee5" strokeDasharray="4 8" />
                <XAxis
                  dataKey="hour"
                  tick={{ fill: "#5b6b75", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "#5b6b75", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  width={36}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid #d4dee5",
                    boxShadow: "0 12px 30px rgba(11,31,42,0.08)",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="kw"
                  stroke="#c46f08"
                  strokeWidth={2.5}
                  fill="url(#kwFill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="rounded-2xl border border-border bg-[linear-gradient(160deg,#0b1f2a_0%,#1f7a6c_120%)] p-6 text-white shadow-[var(--shadow)]">
          <p className="text-xs uppercase tracking-[0.16em] text-white/60">
            Portfolio snapshot
          </p>
          <h3 className="mt-3 font-display text-2xl font-semibold">
            {sites.length === 0
              ? "No sites yet"
              : `${sites.length} site${sites.length === 1 ? "" : "s"} in view`}
          </h3>
          <p className="mt-3 text-sm leading-6 text-white/75">
            Sites are loaded from your organization membership. Telemetry will
            map into these panels next.
          </p>

          {sites.length > 0 ? (
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
