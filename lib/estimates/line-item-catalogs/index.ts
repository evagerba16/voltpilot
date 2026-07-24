export { saveToCompanyLibrary, getCompanyLibraryItems, isInCompanyLibrary } from "@/lib/estimates/line-item-catalogs/company-library";
export { getFavoriteLineItemNames, isLineItemFavorite, toggleLineItemFavorite } from "@/lib/estimates/line-item-catalogs/favorites";
export { getRecentLineItemNames, recordLineItemUse } from "@/lib/estimates/line-item-catalogs/recents";
export {
  getLineItemCatalog,
  isPickerCategory,
  LINE_ITEM_CATALOG_REGISTRY,
  PICKER_CATALOG_CATEGORIES,
} from "@/lib/estimates/line-item-catalogs/registry";
export {
  getCatalogItemByName,
  hasExactLineItemMatch,
  searchLineItemCatalog,
  splitSearchHighlight,
} from "@/lib/estimates/line-item-catalogs/search";
export type {
  LineItemCatalog,
  LineItemCatalogGroup,
  LineItemCatalogItem,
  LineItemSearchResult,
  PickerCatalogCategory,
} from "@/lib/estimates/line-item-catalogs/types";
