import { EQUIPMENT_CATALOG } from "@/lib/estimates/line-item-catalogs/catalogs/equipment";
import type {
  LineItemCatalog,
  LineItemCatalogGroup,
  LineItemCatalogItem,
} from "@/lib/estimates/line-item-catalogs/types";
import { slugify } from "@/lib/estimates/line-item-catalogs/utils";
import type {
  EquipmentCatalogRow,
  OrganizationCatalogItem,
} from "@/lib/estimates/org-catalog/types";

function parseCost(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return null;
  }

  return value;
}

function applyOverride(
  seed: LineItemCatalogItem,
  override: OrganizationCatalogItem | undefined,
  groupLabel: string
): EquipmentCatalogRow {
  const effectiveUnit = override?.default_unit ?? seed.defaultUnit ?? null;
  const effectiveCost = parseCost(override?.default_unit_cost ?? seed.defaultUnitCost);
  const effectiveDescription = override?.description ?? seed.description ?? null;
  const effectiveKeywords =
    override?.keywords && override.keywords.length > 0
      ? override.keywords
      : seed.keywords ?? [];

  return {
    id: seed.id,
    source: override ? "override" : "default",
    catalogItemId: seed.id,
    orgItemId: override?.id ?? null,
    name: seed.name,
    category: seed.category ?? groupLabel,
    description: effectiveDescription,
    defaultUnit: effectiveUnit,
    defaultUnitCost: effectiveCost,
    keywords: effectiveKeywords,
    isHidden: override?.is_hidden ?? false,
    isCustom: false,
    isActive: !(override?.is_hidden ?? false),
  };
}

export function buildEquipmentCatalogRows(
  overrides: OrganizationCatalogItem[]
): EquipmentCatalogRow[] {
  const overrideBySeedId = new Map<string, OrganizationCatalogItem>();
  const customItems: OrganizationCatalogItem[] = [];

  for (const item of overrides) {
    if (item.is_custom || !item.catalog_item_id) {
      customItems.push(item);
      continue;
    }

    overrideBySeedId.set(item.catalog_item_id, item);
  }

  const rows: EquipmentCatalogRow[] = [];

  for (const group of EQUIPMENT_CATALOG.groups) {
    for (const seed of group.items) {
      if (seed.isActive === false) continue;

      const override = overrideBySeedId.get(seed.id);
      const row = applyOverride(seed, override, group.label);
      rows.push(row);
    }
  }

  for (const item of customItems.sort((a, b) => a.sort_order - b.sort_order)) {
    rows.push({
      id: item.id,
      source: "custom",
      catalogItemId: null,
      orgItemId: item.id,
      name: item.name,
      category: "Company Equipment",
      description: item.description,
      defaultUnit: item.default_unit,
      defaultUnitCost: parseCost(item.default_unit_cost),
      keywords: item.keywords,
      isHidden: item.is_hidden,
      isCustom: true,
      isActive: !item.is_hidden,
    });
  }

  return rows.sort((a, b) => a.name.localeCompare(b.name));
}

export function mergeEquipmentCatalog(
  overrides: OrganizationCatalogItem[]
): LineItemCatalog {
  const rows = buildEquipmentCatalogRows(overrides).filter((row) => row.isActive);
  const groups = new Map<string, LineItemCatalogGroup>();

  for (const group of EQUIPMENT_CATALOG.groups) {
    groups.set(group.id, { id: group.id, label: group.label, items: [] });
  }

  for (const row of rows) {
    if (row.source === "custom") {
      const companyGroup = groups.get("company-equipment") ?? {
        id: "company-equipment",
        label: "Company Equipment",
        items: [],
      };
      companyGroup.items.push(rowToCatalogItem(row));
      groups.set("company-equipment", companyGroup);
      continue;
    }

    const seedGroup = EQUIPMENT_CATALOG.groups.find((group) =>
      group.items.some((item) => item.id === row.catalogItemId)
    );

    if (!seedGroup) continue;

    const target = groups.get(seedGroup.id) ?? {
      id: seedGroup.id,
      label: seedGroup.label,
      items: [],
    };

    target.items.push(rowToCatalogItem(row, seedGroup.label));
    groups.set(seedGroup.id, target);
  }

  const mergedGroups = [...groups.values()].filter((group) => group.items.length > 0);

  return {
    category: "equipment",
    label: "Equipment",
    groups: mergedGroups.length > 0 ? mergedGroups : EQUIPMENT_CATALOG.groups,
  };
}

function rowToCatalogItem(row: EquipmentCatalogRow, category?: string): LineItemCatalogItem {
  return {
    id: row.catalogItemId ?? slugify(row.name),
    name: row.name,
    category: category ?? row.category,
    description: row.description ?? undefined,
    defaultUnit: row.defaultUnit ?? undefined,
    defaultUnitCost: row.defaultUnitCost ?? undefined,
    keywords: row.keywords,
    isActive: row.isActive,
  };
}

export function getDefaultEquipmentSeedRows(): EquipmentCatalogRow[] {
  return buildEquipmentCatalogRows([]);
}

export function getEquipmentSeedById(catalogItemId: string) {
  for (const group of EQUIPMENT_CATALOG.groups) {
    const item = group.items.find((entry) => entry.id === catalogItemId);
    if (item) {
      return { item, groupLabel: group.label };
    }
  }

  return null;
}
