export {
  ELECTRICAL_MATERIAL_CATALOG,
} from "@/lib/estimates/material-catalogs/electrical";
export {
  getMaterialCatalog,
  MATERIAL_CATALOG_REGISTRY,
} from "@/lib/estimates/material-catalogs/registry";
export { resolveMaterialTradeId } from "@/lib/estimates/material-catalogs/resolve-trade";
export {
  getFavoriteMaterialNames,
  isMaterialFavorite,
  toggleMaterialFavorite,
} from "@/lib/estimates/material-catalogs/favorites";
export {
  getRecentMaterialNames,
  recordMaterialUse,
} from "@/lib/estimates/material-catalogs/recents";
export {
  getCatalogMaterialByName,
  hasExactMaterialMatch,
  searchMaterialCatalog,
} from "@/lib/estimates/material-catalogs/search";
export {
  MATERIAL_TRADES,
  type MaterialCatalog,
  type MaterialCatalogGroup,
  type MaterialCatalogItem,
  type MaterialSearchResult,
  type MaterialTradeId,
} from "@/lib/estimates/material-catalogs/types";
