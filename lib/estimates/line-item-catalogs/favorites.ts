import type { PickerCatalogCategory } from "@/lib/estimates/line-item-catalogs/types";

const STORAGE_PREFIX = "voltpilot:line-item-favorites:";
const MAX_FAVORITES = 40;

function storageKey(category: PickerCatalogCategory) {
  return `${STORAGE_PREFIX}${category}`;
}

function readFavorites(category: PickerCatalogCategory): string[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(storageKey(category));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as string[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeFavorites(category: PickerCatalogCategory, names: string[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(storageKey(category), JSON.stringify(names));
}

export function getFavoriteLineItemNames(category: PickerCatalogCategory) {
  return readFavorites(category);
}

export function isLineItemFavorite(category: PickerCatalogCategory, name: string) {
  const target = name.trim().toLowerCase();
  return readFavorites(category).some((entry) => entry.toLowerCase() === target);
}

export function toggleLineItemFavorite(
  category: PickerCatalogCategory,
  name: string
): boolean {
  const trimmed = name.trim();
  if (!trimmed) return false;

  const favorites = readFavorites(category);
  const index = favorites.findIndex(
    (entry) => entry.toLowerCase() === trimmed.toLowerCase()
  );

  if (index >= 0) {
    favorites.splice(index, 1);
    writeFavorites(category, favorites);
    return false;
  }

  writeFavorites(
    category,
    [trimmed, ...favorites.filter((e) => e.toLowerCase() !== trimmed.toLowerCase())].slice(
      0,
      MAX_FAVORITES
    )
  );
  return true;
}
