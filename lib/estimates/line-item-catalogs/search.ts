import { getCompanyLibraryItems } from "@/lib/estimates/line-item-catalogs/company-library";
import { getFavoriteLineItemNames } from "@/lib/estimates/line-item-catalogs/favorites";
import { getRecentLineItemNames } from "@/lib/estimates/line-item-catalogs/recents";
import type {
  LineItemCatalog,
  LineItemCatalogItem,
  LineItemSearchResult,
  PickerCatalogCategory,
} from "@/lib/estimates/line-item-catalogs/types";
import { isCatalogItemActive, normalizeSearch, slugify } from "@/lib/estimates/line-item-catalogs/utils";

function itemMatchesQuery(
  item: LineItemCatalogItem,
  groupLabel: string,
  query: string
) {
  if (item.isActive === false) {
    return false;
  }

  if (!query) return true;

  const haystacks = [
    item.name,
    item.category,
    item.description,
    groupLabel,
    ...(item.keywords ?? []),
  ]
    .filter(Boolean)
    .map((value) => normalizeSearch(String(value)));

  return haystacks.some(
    (value) => value.includes(query) || query.includes(value)
  );
}

function findCatalogItemByName(catalog: LineItemCatalog, name: string) {
  const target = normalizeSearch(name);

  for (const group of catalog.groups) {
    for (const item of group.items) {
      if (normalizeSearch(item.name) === target) {
        return { item, groupLabel: group.label, groupId: group.id };
      }
    }
  }

  return null;
}

export function getCatalogItemByName(catalog: LineItemCatalog, name: string) {
  return findCatalogItemByName(catalog, name);
}

export function hasExactLineItemMatch(
  catalog: LineItemCatalog,
  category: PickerCatalogCategory,
  query: string
) {
  const normalizedQuery = normalizeSearch(query);
  if (!normalizedQuery) return false;

  for (const group of catalog.groups) {
    for (const item of group.items) {
      if (item.isActive === false) continue;
      if (normalizeSearch(item.name) === normalizedQuery) {
        return true;
      }
    }
  }

  const recentNames = getRecentLineItemNames(category);
  if (recentNames.some((name) => normalizeSearch(name) === normalizedQuery)) {
    return true;
  }

  const companyItems = getCompanyLibraryItems(category);
  return companyItems.some((entry) => normalizeSearch(entry.name) === normalizedQuery);
}

export function searchLineItemCatalog(
  catalog: LineItemCatalog,
  category: PickerCatalogCategory,
  query: string,
  options?: {
    favoriteNames?: string[];
    recentNames?: string[];
  }
): LineItemSearchResult[] {
  const normalizedQuery = normalizeSearch(query);
  const favoriteNames = options?.favoriteNames ?? getFavoriteLineItemNames(category);
  const recentNames = options?.recentNames ?? getRecentLineItemNames(category);
  const companyItems = getCompanyLibraryItems(category);
  const results: LineItemSearchResult[] = [];
  const seen = new Set<string>();

  function pushResult(
    item: LineItemCatalogItem,
    groupLabel: string,
    flags: { isRecent?: boolean; isFavorite?: boolean; isCompany?: boolean } = {}
  ) {
    if (!isCatalogItemActive(item)) return;
    const key = normalizeSearch(item.name);
    if (seen.has(key)) return;
    seen.add(key);
    results.push({ item, groupLabel, ...flags });
  }

  for (const favoriteName of favoriteNames) {
    const match = findCatalogItemByName(catalog, favoriteName);
    if (match && itemMatchesQuery(match.item, match.groupLabel, normalizedQuery)) {
      pushResult(match.item, match.groupLabel, { isFavorite: true });
      continue;
    }

    if (!normalizedQuery || normalizeSearch(favoriteName).includes(normalizedQuery)) {
      pushResult(
        { id: `favorite-${slugify(favoriteName)}`, name: favoriteName },
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

    if (!normalizedQuery || normalizeSearch(recentName).includes(normalizedQuery)) {
      pushResult(
        { id: `recent-${slugify(recentName)}`, name: recentName },
        "Recently used",
        { isRecent: true }
      );
    }
  }

  for (const companyItem of companyItems) {
    if (
      !normalizedQuery ||
      normalizeSearch(companyItem.name).includes(normalizedQuery)
    ) {
      pushResult(
        {
          id: `company-${slugify(companyItem.name)}`,
          name: companyItem.name,
          defaultUnit: companyItem.defaultUnit,
          defaultUnitCost: companyItem.defaultUnitCost,
        },
        "Company library",
        { isCompany: true }
      );
    }
  }

  for (const group of catalog.groups) {
    for (const item of group.items) {
      if (item.isActive === false) continue;
      if (itemMatchesQuery(item, group.label, normalizedQuery)) {
        pushResult(item, group.label);
      }
    }
  }

  return results;
}

export function splitSearchHighlight(text: string, query: string) {
  const normalizedQuery = normalizeSearch(query);
  if (!normalizedQuery) {
    return [{ text, match: false }];
  }

  const lowerText = text.toLowerCase();
  const index = lowerText.indexOf(normalizedQuery);

  if (index === -1) {
    return [{ text, match: false }];
  }

  return [
    { text: text.slice(0, index), match: false },
    { text: text.slice(index, index + normalizedQuery.length), match: true },
    { text: text.slice(index + normalizedQuery.length), match: false },
  ].filter((part) => part.text.length > 0);
}
