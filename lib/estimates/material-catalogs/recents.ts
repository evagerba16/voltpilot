import type { MaterialTradeId } from "@/lib/estimates/material-catalogs/types";

const STORAGE_PREFIX = "voltpilot:material-recents:";
const MAX_RECENTS = 12;

type RecentEntry = {
  name: string;
  count: number;
  lastUsed: number;
};

function storageKey(tradeId: MaterialTradeId) {
  return `${STORAGE_PREFIX}${tradeId}`;
}

function readRecents(tradeId: MaterialTradeId): RecentEntry[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(storageKey(tradeId));
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as RecentEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeRecents(tradeId: MaterialTradeId, entries: RecentEntry[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(storageKey(tradeId), JSON.stringify(entries));
}

export function getRecentMaterialNames(tradeId: MaterialTradeId): string[] {
  return readRecents(tradeId)
    .sort((a, b) => {
      if (b.count !== a.count) {
        return b.count - a.count;
      }

      return b.lastUsed - a.lastUsed;
    })
    .map((entry) => entry.name);
}

export function recordMaterialUse(tradeId: MaterialTradeId, name: string) {
  const trimmed = name.trim();
  if (!trimmed) {
    return;
  }

  const entries = readRecents(tradeId);
  const existing = entries.find(
    (entry) => entry.name.toLowerCase() === trimmed.toLowerCase()
  );

  if (existing) {
    existing.count += 1;
    existing.lastUsed = Date.now();
    existing.name = trimmed;
  } else {
    entries.push({
      name: trimmed,
      count: 1,
      lastUsed: Date.now(),
    });
  }

  writeRecents(
    tradeId,
    entries
      .sort((a, b) => {
        if (b.count !== a.count) {
          return b.count - a.count;
        }

        return b.lastUsed - a.lastUsed;
      })
      .slice(0, MAX_RECENTS)
  );
}
