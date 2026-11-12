import { Suspense } from "react";

import { DashboardLoadingState } from "@/components/dashboard-loading-state";
import { TankSetup } from "@/components/tank-setup";
import { canManageSites } from "@/lib/auth/roles";
import { getDashboardContext } from "@/lib/auth/session";
import { getTankSetup } from "@/lib/tanks/queries";

async function TanksPageContent() {
  const context = await getDashboardContext();
  const site = context.selectedSite;

  if (!site) {
    return (
      <section className="animate-rise max-w-2xl">
        <h2 className="font-display text-3xl font-semibold tracking-tight text-foreground">
          Tank setup
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          Create a site first. Tank dimensions are saved against the site you
          have selected.
        </p>
      </section>
    );
  }

  const setup = await getTankSetup(site.id);
  const canEdit =
    !!context.activeOrganization && canManageSites(context.activeOrganization.role);

  return (
    <TankSetup
      siteId={site.id}
      siteName={site.name}
      canEdit={canEdit}
      tanks={setup.tanks}
      sensors={setup.sensors}
      loadError={setup.error}
    />
  );
}

export default function TanksPage() {
  return (
    <Suspense fallback={<DashboardLoadingState message="Loading tank setup…" />}>
      <TanksPageContent />
    </Suspense>
  );
}
