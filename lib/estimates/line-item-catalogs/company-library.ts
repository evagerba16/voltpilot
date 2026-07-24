import type {
  CompanyLibraryItem,
  PickerCatalogCategory,
} from "@/lib/estimates/line-item-catalogs/types";

const STORAGE_PREFIX = "voltpilot:company-line-items:";
const MAX_ITEMS = 100;

function storageKey(category: PickerCatalogCategory) {
  return `${STORAGE_PREFIX}${category}`;
}

function readLibrary(category: PickerCatalogCategory): CompanyLibraryItem[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(storageKey(category));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CompanyLibraryItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLibrary(category: PickerCatalogCategory, items: CompanyLibraryItem[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(storageKey(category), JSON.stringify(items));
}

export function getCompanyLibraryItems(category: PickerCatalogCategory) {
  return readLibrary(category);
}

export function saveToCompanyLibrary(
  category: PickerCatalogCategory,
  name: string,
  defaultUnit?: string,
  defaultUnitCost?: number
) {
  const trimmed = name.trim();
  if (!trimmed) return false;

  const library = readLibrary(category).filter(
    (entry) => entry.name.toLowerCase() !== trimmed.toLowerCase()
  );

  writeLibrary(category, [
    {
      name: trimmed,
      defaultUnit,
      defaultUnitCost,
      createdAt: new Date().toISOString(),
    },
    ...library,
  ].slice(0, MAX_ITEMS));

  return true;
}

export function isInCompanyLibrary(category: PickerCatalogCategory, name: string) {
  const target = name.trim().toLowerCase();
  return readLibrary(category).some((entry) => entry.name.toLowerCase() === target);
}

export function removeFromCompanyLibrary(category: PickerCatalogCategory, name: string) {
  const target = name.trim().toLowerCase();
  writeLibrary(
    category,
    readLibrary(category).filter((entry) => entry.name.toLowerCase() !== target)
  );
}
