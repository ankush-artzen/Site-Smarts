"use client";

import { useTransition } from "react";

import { setSelectedSite } from "@/lib/actions/sites";
import type { Site } from "@/lib/types/database";

type SiteSwitcherProps = {
  sites: Site[];
  selectedSiteId: string | null;
};

export function SiteSwitcher({ sites, selectedSiteId }: SiteSwitcherProps) {
  const [pending, startTransition] = useTransition();

  if (sites.length === 0) {
    return (
      <p className="rounded-full bg-surface-soft px-3 py-1.5 text-xs font-medium text-muted">
        No sites yet
      </p>
    );
  }

  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="hidden text-muted sm:inline">Site</span>
      <select
        disabled={pending}
        value={selectedSiteId ?? sites[0]?.id}
        onChange={(e) => {
          const siteId = e.target.value;
          startTransition(async () => {
            await setSelectedSite({ siteId });
          });
        }}
        className="max-w-[220px] rounded-xl border border-border bg-surface px-3 py-2 text-sm font-medium text-foreground outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20 disabled:opacity-60"
      >
        {sites.map((site) => (
          <option key={site.id} value={site.id}>
            {site.name}
          </option>
        ))}
      </select>
    </label>
  );
}
