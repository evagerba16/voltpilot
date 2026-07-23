import type { MaterialTradeId } from "@/lib/estimates/material-catalogs/types";

const STORAGE_PREFIX = "voltpilot:material-favorites:";
const MAX_FAVORITES = 30;

function storageKey(tradeId: MaterialTradeId) {
  return `${STORAGE_PREFIX}${tradeId}`;
}

function readFavorites(tradeId: MaterialTradeId): string[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(storageKey(tradeId));
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as string[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeFavorites(tradeId: MaterialTradeId, names: string[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(storageKey(tradeId), JSON.stringify(names));
}

export function getFavoriteMaterialNames(tradeId: MaterialTradeId): string[] {
  return readFavorites(tradeId);
}

export function isMaterialFavorite(tradeId: MaterialTradeId, name: string): boolean {
  const target = name.trim().toLowerCase();
  return readFavorites(tradeId).some(
    (entry) => entry.toLowerCase() === target
  );
}

export function toggleMaterialFavorite(tradeId: MaterialTradeId, name: string): boolean {
  const trimmed = name.trim();
  if (!trimmed) {
    return false;
  }

  const favorites = readFavorites(tradeId);
  const index = favorites.findIndex(
    (entry) => entry.toLowerCase() === trimmed.toLowerCase()
  );

  if (index >= 0) {
    favorites.splice(index, 1);
    writeFavorites(tradeId, favorites);
    return false;
  }

  writeFavorites(
    tradeId,
    [trimmed, ...favorites.filter((entry) => entry.toLowerCase() !== trimmed.toLowerCase())].slice(
      0,
      MAX_FAVORITES
    )
  );
  return true;
}
