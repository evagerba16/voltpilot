const STORAGE_KEY = "voltpilot:assembly-recents";
const MAX_RECENTS = 12;

function readRecents(): string[] {
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

function writeRecents(ids: string[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
}

export function getRecentAssemblyIds() {
  return readRecents();
}

export function recordAssemblyUse(assemblyId: string) {
  if (!assemblyId) return;
  writeRecents([assemblyId, ...readRecents().filter((id) => id !== assemblyId)].slice(0, MAX_RECENTS));
}
