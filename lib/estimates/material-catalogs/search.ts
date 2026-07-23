import { getFavoriteMaterialNames } from "@/lib/estimates/material-catalogs/favorites";
import { getRecentMaterialNames } from "@/lib/estimates/material-catalogs/recents";
import type {
  MaterialCatalog,
  MaterialCatalogItem,
  MaterialSearchResult,
  MaterialTradeId,
} from "@/lib/estimates/material-catalogs/types";

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function itemMatchesQuery(
  item: MaterialCatalogItem,
  groupLabel: string,
  query: string
) {
  if (!query) {
    return true;
  }

  const haystacks = [
    item.name,
    groupLabel,
    ...(item.keywords ?? []),
  ].map(normalize);

  return haystacks.some(
    (value) => value.includes(query) || query.includes(value)
  );
}

function findCatalogItemByName(catalog: MaterialCatalog, name: string) {
  const target = normalize(name);

  for (const group of catalog.groups) {
    for (const item of group.items) {
      if (normalize(item.name) === target) {
        return { item, groupLabel: group.label };
      }
    }
  }

  return null;
}

export function getCatalogMaterialByName(catalog: MaterialCatalog, name: string) {
  return findCatalogItemByName(catalog, name);
}

export function searchMaterialCatalog(
  catalog: MaterialCatalog,
  tradeId: MaterialTradeId,
  query: string,
  options?: {
    favoriteNames?: string[];
    recentNames?: string[];
  }
): MaterialSearchResult[] {
  const normalizedQuery = normalize(query);
  const favoriteNames = options?.favoriteNames ?? getFavoriteMaterialNames(tradeId);
  const recentNames = options?.recentNames ?? getRecentMaterialNames(tradeId);
  const results: MaterialSearchResult[] = [];
  const seen = new Set<string>();

  function pushResult(
    item: MaterialCatalogItem,
    groupLabel: string,
    options: { isRecent?: boolean; isFavorite?: boolean } = {}
  ) {
    const key = normalize(item.name);
    if (seen.has(key)) {
      return;
    }

    seen.add(key);
    results.push({
      item,
      groupLabel,
      isRecent: options.isRecent,
      isFavorite: options.isFavorite,
    });
  }

  for (const favoriteName of favoriteNames) {
    const match = findCatalogItemByName(catalog, favoriteName);
    if (match && itemMatchesQuery(match.item, match.groupLabel, normalizedQuery)) {
      pushResult(match.item, match.groupLabel, { isFavorite: true });
      continue;
    }

    if (!normalizedQuery || normalize(favoriteName).includes(normalizedQuery)) {
      pushResult(
        {
          id: `favorite-${normalize(favoriteName)}`,
          name: favoriteName,
        },
        "Favorites",
        { isFavorite: true }
      );
    }
  }

  for (const recentName of recentNames) {
    const match = findCatalogItemByName(catalog, recentName);
    if (match && itemMatchesQuery(match.item, match.groupLabel, normalizedQuery)) {
      pushResult(match.item, match.groupLabel, { isRecent: true });
      continue;
    }

    if (!normalizedQuery || normalize(recentName).includes(normalizedQuery)) {
      pushResult(
        {
          id: `recent-${normalize(recentName)}`,
          name: recentName,
        },
        "Recently used",
        { isRecent: true }
      );
    }
  }

  for (const group of catalog.groups) {
    for (const item of group.items) {
      if (itemMatchesQuery(item, group.label, normalizedQuery)) {
        pushResult(item, group.label);
      }
    }
  }

  return results;
}

export function hasExactMaterialMatch(catalog: MaterialCatalog, query: string) {
  const normalizedQuery = normalize(query);
  if (!normalizedQuery) {
    return false;
  }

  for (const group of catalog.groups) {
    for (const item of group.items) {
      if (normalize(item.name) === normalizedQuery) {
        return true;
      }
    }
  }

  const recentNames = getRecentMaterialNames(catalog.tradeId);
  return recentNames.some((name) => normalize(name) === normalizedQuery);
}
