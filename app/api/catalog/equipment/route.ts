import { NextResponse } from "next/server";

import { getTeamContext } from "@/lib/auth/get-team-context";
import { mergeEquipmentCatalog } from "@/lib/estimates/org-catalog/merge-equipment";
import { getOrganizationCatalogItems } from "@/lib/estimates/org-catalog/queries";
import { hasPermission } from "@/lib/teams/permissions";

export async function GET() {
  const context = await getTeamContext();

  if (!context || !hasPermission(context.permissions, "estimates.view")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const overrides = await getOrganizationCatalogItems(context.organizationId, "equipment");
    const catalog = mergeEquipmentCatalog(overrides);

    return NextResponse.json({ catalog });
  } catch {
    return NextResponse.json({ error: "Unable to load equipment catalog." }, { status: 500 });
  }
}
