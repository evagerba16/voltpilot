import { EQUIPMENT_CATALOG } from "@/lib/estimates/line-item-catalogs/catalogs/equipment";
import { LABOR_CATALOG } from "@/lib/estimates/line-item-catalogs/catalogs/labor";
import { MATERIALS_CATALOG } from "@/lib/estimates/line-item-catalogs/catalogs/materials";
import { SUBCONTRACTORS_CATALOG } from "@/lib/estimates/line-item-catalogs/catalogs/subcontractors";
import type {
  LineItemCatalog,
  PickerCatalogCategory,
} from "@/lib/estimates/line-item-catalogs/types";

export const LINE_ITEM_CATALOG_REGISTRY: Record<
  PickerCatalogCategory,
  LineItemCatalog
> = {
  labor: LABOR_CATALOG,
  materials: MATERIALS_CATALOG,
  equipment: EQUIPMENT_CATALOG,
  subcontractors: SUBCONTRACTORS_CATALOG,
};

export const PICKER_CATALOG_CATEGORIES = [
  "labor",
  "materials",
  "equipment",
  "subcontractors",
] as const satisfies readonly PickerCatalogCategory[];

export function getLineItemCatalog(category: PickerCatalogCategory) {
  return LINE_ITEM_CATALOG_REGISTRY[category];
}

export function isPickerCategory(
  category: string
): category is PickerCatalogCategory {
  return (
    category === "labor" ||
    category === "materials" ||
    category === "equipment" ||
    category === "subcontractors"
  );
}
