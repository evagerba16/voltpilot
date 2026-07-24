import type { LineItemCatalogItem } from "@/lib/estimates/line-item-catalogs/types";

export type OrgCatalogCategory = "equipment";

export type OrganizationCatalogItem = {
  id: string;
  organization_id: string;
  category: OrgCatalogCategory;
  catalog_item_id: string | null;
  name: string;
  default_unit: string | null;
  default_unit_cost: number | null;
  description: string | null;
  keywords: string[];
  is_hidden: boolean;
  is_custom: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type OrganizationCatalogItemInput = {
  id?: string;
  catalog_item_id?: string | null;
  name: string;
  default_unit?: string | null;
  default_unit_cost?: number | null;
  description?: string | null;
  keywords?: string[];
  is_hidden?: boolean;
  is_custom?: boolean;
  sort_order?: number;
};

export type EquipmentCatalogRow = {
  id: string;
  source: "default" | "override" | "custom";
  catalogItemId: string | null;
  orgItemId: string | null;
  name: string;
  category: string;
  description: string | null;
  defaultUnit: string | null;
  defaultUnitCost: number | null;
  keywords: string[];
  isHidden: boolean;
  isCustom: boolean;
  isActive: boolean;
};

export type EquipmentCatalogExportRow = {
  name: string;
  unit: string;
  unit_cost: string;
  description: string;
  keywords: string;
  catalog_item_id: string;
  is_hidden: string;
  source: string;
};

export function orgItemToCatalogItem(item: OrganizationCatalogItem): LineItemCatalogItem {
  return {
    id: item.catalog_item_id ?? item.id,
    name: item.name,
    category: "Equipment",
    description: item.description ?? undefined,
    defaultUnit: item.default_unit ?? undefined,
    defaultUnitCost: item.default_unit_cost ?? undefined,
    keywords: item.keywords,
    isActive: !item.is_hidden,
  };
}
