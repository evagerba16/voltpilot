const STORAGE_KEY = "voltpilot:assembly-favorites";
const MAX_FAVORITES = 30;

function readFavorites(): string[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as string[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeFavorites(ids: string[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
}

export function getFavoriteAssemblyIds() {
  return readFavorites();
}

export function isAssemblyFavorite(assemblyId: string) {
  return readFavorites().includes(assemblyId);
}

export function toggleAssemblyFavorite(assemblyId: string): boolean {
  const favorites = readFavorites();
  const index = favorites.indexOf(assemblyId);

  if (index >= 0) {
    favorites.splice(index, 1);
    writeFavorites(favorites);
    return false;
  }

  writeFavorites([assemblyId, ...favorites.filter((id) => id !== assemblyId)].slice(0, MAX_FAVORITES));
  return true;
}
