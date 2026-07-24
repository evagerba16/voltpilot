import type { EstimateCategory } from "@/lib/estimates/types";

export type PickerCatalogCategory = Extract<
  EstimateCategory,
  "labor" | "materials" | "equipment" | "subcontractors"
>;

export type LineItemCatalogItem = {
  id: string;
  name: string;
  /** Display category label (e.g. Aerial Lifts) */
  category?: string;
  description?: string;
  defaultUnit?: string;
  defaultUnitCost?: number;
  keywords?: string[];
  /** Defaults to true when omitted */
  isActive?: boolean;
};

export type LineItemCatalogGroup = {
  id: string;
  label: string;
  items: LineItemCatalogItem[];
};

export type LineItemCatalog = {
  category: PickerCatalogCategory;
  label: string;
  groups: LineItemCatalogGroup[];
};

export type LineItemSearchResult = {
  item: LineItemCatalogItem;
  groupLabel: string;
  isRecent?: boolean;
  isFavorite?: boolean;
  isCompany?: boolean;
};

export type CompanyLibraryItem = {
  name: string;
  defaultUnit?: string;
  defaultUnitCost?: number;
  createdAt: string;
};
