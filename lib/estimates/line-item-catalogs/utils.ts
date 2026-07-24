import type { LineItemCatalogItem } from "@/lib/estimates/line-item-catalogs/types";

export function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function catalogItem(
  name: string,
  defaultUnit?: string,
  keywords?: string[],
  defaultUnitCost?: number,
  extras?: Pick<LineItemCatalogItem, "description" | "category" | "isActive">
): LineItemCatalogItem {
  return {
    id: slugify(name),
    name,
    defaultUnit,
    defaultUnitCost,
    keywords,
    ...extras,
    isActive: extras?.isActive ?? true,
  };
}

export function isCatalogItemActive(item: LineItemCatalogItem) {
  return item.isActive !== false;
}

export function normalizeSearch(value: string) {
  return value.trim().toLowerCase();
}
