export const MATERIAL_TRADES = [
  "electrical",
  "plumbing",
  "hvac",
  "roofing",
  "concrete",
  "framing",
  "drywall",
  "painting",
  "landscaping",
  "low_voltage",
  "solar",
] as const;

export type MaterialTradeId = (typeof MATERIAL_TRADES)[number];

export type MaterialCatalogItem = {
  id: string;
  name: string;
  /** Default unit of measure when this catalog item is selected. */
  defaultUnit?: string;
  /** Search aliases (e.g. "romex", "nm-b"). */
  keywords?: string[];
};

export type MaterialCatalogGroup = {
  id: string;
  label: string;
  items: MaterialCatalogItem[];
};

export type MaterialCatalog = {
  tradeId: MaterialTradeId;
  tradeLabel: string;
  groups: MaterialCatalogGroup[];
};

export type MaterialSearchResult = {
  item: MaterialCatalogItem;
  groupLabel: string;
  isRecent?: boolean;
  isFavorite?: boolean;
};
