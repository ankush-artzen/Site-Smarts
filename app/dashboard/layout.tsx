import { Suspense } from "react";

import { DashboardLoadingState } from "@/components/dashboard-loading-state";
import { DashboardShell } from "@/components/dashboard-shell";
import { getDashboardContext } from "@/lib/auth/session";

async function AuthenticatedDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const context = await getDashboardContext();

  return (
    <DashboardShell
      email={context.email}
      profileName={context.profile.full_name}
      organizations={context.organizations}
      sites={context.sites}
      selectedSiteId={context.selectedSite?.id ?? null}
      activeOrganization={context.activeOrganization}
    >
      {children}
    </DashboardShell>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Auth/session uses connection() + cookies — must sit behind Suspense
  // so Cache Components can prerender a static shell (instant navigations).
  return (
    <Suspense fallback={<DashboardLoadingState />}>
      <AuthenticatedDashboardLayout>{children}</AuthenticatedDashboardLayout>
    </Suspense>
  );
}
