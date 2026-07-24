"use server";

import { revalidatePath } from "next/cache";

import { assertPermission } from "@/lib/auth/get-team-context";
import { parseEquipmentCsv } from "@/lib/estimates/org-catalog/csv";
import { buildEquipmentCatalogRows, getEquipmentSeedById } from "@/lib/estimates/org-catalog/merge-equipment";
import {
  deleteOrganizationCatalogItem,
  getOrganizationCatalogItems,
  resetOrganizationCatalogOverride,
  upsertOrganizationCatalogItem,
} from "@/lib/estimates/org-catalog/queries";
import type { OrganizationCatalogItemInput } from "@/lib/estimates/org-catalog/types";
import { normalizeUnitForCategory } from "@/lib/estimates/units";

function revalidateEquipmentCatalog() {
  revalidatePath("/settings/equipment");
  revalidatePath("/estimates");
}

export async function saveEquipmentCatalogItem(input: OrganizationCatalogItemInput) {
  const context = await assertPermission("settings.company.edit");

  try {
    const saved = await upsertOrganizationCatalogItem(
      context.organizationId,
      "equipment",
      input
    );
    revalidateEquipmentCatalog();
    return { success: true, item: saved };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Unable to save equipment item.",
    };
  }
}

export async function toggleEquipmentHidden(catalogItemId: string, hidden: boolean) {
  const context = await assertPermission("settings.company.edit");

  const seed = getEquipmentSeedById(catalogItemId);
  if (!seed) {
    return { error: "Equipment item not found." };
  }

  try {
    const saved = await upsertOrganizationCatalogItem(context.organizationId, "equipment", {
      catalog_item_id: catalogItemId,
      name: seed.item.name,
      default_unit: seed.item.defaultUnit ?? null,
      default_unit_cost: seed.item.defaultUnitCost ?? null,
      description: seed.item.description ?? null,
      keywords: seed.item.keywords ?? [],
      is_hidden: hidden,
      is_custom: false,
    });
    revalidateEquipmentCatalog();
    return { success: true, item: saved };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Unable to update equipment visibility.",
    };
  }
}

export async function deleteCustomEquipmentItem(itemId: string) {
  const context = await assertPermission("settings.company.edit");

  try {
    await deleteOrganizationCatalogItem(context.organizationId, itemId);
    revalidateEquipmentCatalog();
    return { success: true };
  } catch {
    return { error: "Unable to delete equipment item." };
  }
}

export async function resetEquipmentOverride(catalogItemId: string) {
  const context = await assertPermission("settings.company.edit");

  try {
    await resetOrganizationCatalogOverride(context.organizationId, catalogItemId);
    revalidateEquipmentCatalog();
    return { success: true };
  } catch {
    return { error: "Unable to reset equipment override." };
  }
}

export async function importEquipmentCsv(formData: FormData) {
  const context = await assertPermission("settings.company.edit");
  const file = formData.get("file");

  if (!(file instanceof File) || file.size <= 0) {
    return { error: "Choose a CSV file to import." };
  }

  const content = await file.text();
  const rows = parseEquipmentCsv(content);

  if (rows.length === 0) {
    return { error: "No equipment rows found in this CSV." };
  }

  let imported = 0;
  const errors: string[] = [];

  for (const row of rows) {
    try {
      const unit = row.unit
        ? normalizeUnitForCategory("equipment", row.unit)
        : null;
      const cost = row.unit_cost ? Number(row.unit_cost) : null;
      const keywords = row.keywords
        ? row.keywords.split("|").map((value) => value.trim()).filter(Boolean)
        : [];

      await upsertOrganizationCatalogItem(context.organizationId, "equipment", {
        catalog_item_id: row.catalog_item_id || null,
        name: row.name,
        default_unit: unit,
        default_unit_cost: Number.isFinite(cost) ? cost : null,
        description: row.description || null,
        keywords,
        is_hidden: row.is_hidden.toLowerCase() === "true",
        is_custom: !row.catalog_item_id,
      });

      imported += 1;
    } catch (error) {
      errors.push(
        `${row.name}: ${error instanceof Error ? error.message : "Import failed"}`
      );
    }
  }

  revalidateEquipmentCatalog();

  return {
    success: true,
    imported,
    skipped: errors.length,
    errors: errors.slice(0, 8),
  };
}

export async function exportEquipmentCsv() {
  const context = await assertPermission("settings.company.view");
  const overrides = await getOrganizationCatalogItems(context.organizationId, "equipment");
  const rows = buildEquipmentCatalogRows(overrides);

  const { equipmentRowsToCsv } = await import("@/lib/estimates/org-catalog/csv");

  return {
    filename: "voltpilot-equipment-catalog.csv",
    content: equipmentRowsToCsv(rows),
  };
}

export async function migrateLocalEquipmentLibrary(items: Array<{
  name: string;
  defaultUnit?: string;
  defaultUnitCost?: number;
}>) {
  const context = await assertPermission("settings.company.edit");

  let imported = 0;

  for (const item of items) {
    if (!item.name.trim()) continue;

    await upsertOrganizationCatalogItem(context.organizationId, "equipment", {
      name: item.name.trim(),
      default_unit: item.defaultUnit ?? "day",
      default_unit_cost: item.defaultUnitCost ?? null,
      is_custom: true,
    });

    imported += 1;
  }

  revalidateEquipmentCatalog();
  return { success: true, imported };
}
