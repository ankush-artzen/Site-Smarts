import { Suspense } from "react";

import { DashboardLoadingState } from "@/components/dashboard-loading-state";
import { DashboardOverview } from "@/components/dashboard-overview";
import { getDashboardContext } from "@/lib/auth/session";

async function DashboardPageContent() {
  const context = await getDashboardContext();

  return (
    <DashboardOverview
      email={context.email}
      profileName={context.profile.full_name}
      organizations={context.organizations}
      sites={context.sites}
      selectedSite={context.selectedSite}
      activeOrganization={context.activeOrganization}
    />
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardLoadingState message="Loading overview…" />}>
      <DashboardPageContent />
    </Suspense>
  );
}
