import Link from "next/link";
import { Activity, Droplets, LayoutDashboard, LogOut, Sun } from "lucide-react";

import { BrandMark } from "@/components/brand-mark";
import { SiteSwitcher } from "@/components/site-switcher";
import { signOut } from "@/lib/actions/auth";
import type { OrganizationWithRole, Site } from "@/lib/types/database";

const nav = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/tanks", label: "Tanks", icon: Droplets },
  { href: "/dashboard", label: "Sites", icon: Sun },
  { href: "/dashboard", label: "Live feed", icon: Activity },
];

type DashboardShellProps = {
  email: string;
  profileName?: string | null;
  organizations: OrganizationWithRole[];
  sites: Site[];
  selectedSiteId: string | null;
  activeOrganization: OrganizationWithRole | null;
  children: React.ReactNode;
};

export function DashboardShell({
  email,
  profileName,
  organizations,
  sites,
  selectedSiteId,
  activeOrganization,
  children,
}: DashboardShellProps) {
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="border-b border-border bg-surface/90 px-5 py-6 backdrop-blur lg:border-b-0 lg:border-r">
        <BrandMark />

        <nav className="mt-10 space-y-1">
          {nav.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.label}
                href={item.href}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted transition hover:bg-surface-soft hover:text-foreground"
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-10 rounded-2xl bg-surface-soft p-4 lg:mt-16">
          <p className="text-xs uppercase tracking-[0.14em] text-muted">
            Signed in
          </p>
          <p className="mt-2 truncate text-sm font-medium text-foreground">
            {profileName || email}
          </p>
          <p className="mt-1 truncate text-xs text-muted">{email}</p>
          {activeOrganization ? (
            <p className="mt-3 text-xs text-muted">
              {activeOrganization.name}
              <span className="ml-1 capitalize text-teal">
                · {activeOrganization.role}
              </span>
            </p>
          ) : organizations.length === 0 ? (
            <p className="mt-3 text-xs text-muted">No organization yet</p>
          ) : null}
          <form action={signOut} className="mt-4">
            <button
              type="submit"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-sm font-medium text-foreground transition hover:border-accent hover:text-accent-strong"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </form>
        </div>
      </aside>

      <div className="flex min-h-screen flex-col">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-surface/70 px-5 py-4 backdrop-blur sm:px-8">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-muted">
              Operations
            </p>
            <h1 className="font-display text-xl font-semibold text-foreground sm:text-2xl">
              Monitoring dashboard
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <SiteSwitcher sites={sites} selectedSiteId={selectedSiteId} />
            <div className="inline-flex items-center gap-2 rounded-full bg-teal-soft px-3 py-1.5 text-xs font-semibold text-teal">
              <span className="live-dot h-2 w-2 rounded-full bg-teal" />
              Systems online
            </div>
          </div>
        </header>

        <main className="flex-1 px-5 py-6 sm:px-8 sm:py-8">{children}</main>
      </div>
    </div>
  );
}
