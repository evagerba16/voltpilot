import type { PickerCatalogCategory } from "@/lib/estimates/line-item-catalogs/types";

const STORAGE_PREFIX = "voltpilot:line-item-recents:";
const MAX_RECENTS = 16;

function storageKey(category: PickerCatalogCategory) {
  return `${STORAGE_PREFIX}${category}`;
}

function readRecents(category: PickerCatalogCategory): string[] {
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

function writeRecents(category: PickerCatalogCategory, names: string[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(storageKey(category), JSON.stringify(names));
}

export function getRecentLineItemNames(category: PickerCatalogCategory) {
  return readRecents(category);
}

export function recordLineItemUse(category: PickerCatalogCategory, name: string) {
  const trimmed = name.trim();
  if (!trimmed) return;

  const recents = readRecents(category).filter(
    (entry) => entry.toLowerCase() !== trimmed.toLowerCase()
  );

  writeRecents(category, [trimmed, ...recents].slice(0, MAX_RECENTS));
}
