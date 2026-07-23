"use client";

import { useEffect, useRef } from "react";

import { syncOrganizationPreference } from "@/lib/teams/actions";

type OrganizationPreferenceSyncProps = {
  organizationId: string;
};

export function OrganizationPreferenceSync({
  organizationId,
}: OrganizationPreferenceSyncProps) {
  const lastSyncedId = useRef<string | null>(null);

  useEffect(() => {
    if (!organizationId || lastSyncedId.current === organizationId) {
      return;
    }

    lastSyncedId.current = organizationId;
    void syncOrganizationPreference(organizationId);
  }, [organizationId]);

  return null;
}
