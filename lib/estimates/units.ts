import { type EstimateCategory } from "@/lib/estimates/types";

export type EstimateUnitDefinition = {
  defaultUnit: string;
  options: readonly string[];
};

/** Category-specific unit defaults and dropdown options. Extend here to add units globally. */
export const ESTIMATE_UNIT_CATALOG: Record<EstimateCategory, EstimateUnitDefinition> = {
  labor: {
    defaultUnit: "hrs",
    options: ["hrs", "day", "wk", "ls"],
  },
  materials: {
    defaultUnit: "ea",
    options: [
      "ea",
      "ft",
      "lf",
      "sf",
      "sy",
      "cf",
      "cy",
      "gal",
      "qt",
      "bag",
      "box",
      "roll",
      "sheet",
      "lb",
      "ton",
    ],
  },
  equipment: {
    defaultUnit: "day",
    options: ["hrs", "day", "wk", "mo", "ea", "ls"],
  },
  subcontractors: {
    defaultUnit: "ls",
    options: ["ls", "hrs", "day", "sf", "lf", "ea"],
  },
  miscellaneous: {
    defaultUnit: "ea",
    options: ["ea", "ls", "day", "hrs"],
  },
};

/** Flat list of every known unit (for validation, AI, etc.). */
export const ALL_ESTIMATE_UNITS = [
  ...new Set(
    Object.values(ESTIMATE_UNIT_CATALOG).flatMap((entry) => [
      entry.defaultUnit,
      ...entry.options,
    ])
  ),
] as const;

const LEGACY_UNIT_ALIASES: Record<string, string> = {
  days: "day",
  day: "day",
  hour: "hrs",
  hours: "hrs",
  hr: "hrs",
  week: "wk",
  weeks: "wk",
  lot: "ls",
};

export function getDefaultUnitForCategory(category: EstimateCategory): string {
  return ESTIMATE_UNIT_CATALOG[category].defaultUnit;
}

export function getUnitOptionsForCategory(
  category: EstimateCategory
): readonly string[] {
  return ESTIMATE_UNIT_CATALOG[category].options;
}

export function normalizeUnitForCategory(
  category: EstimateCategory,
  unit: string | null | undefined
): string {
  const trimmed = unit?.trim();
  if (!trimmed) {
    return getDefaultUnitForCategory(category);
  }

  const aliased = LEGACY_UNIT_ALIASES[trimmed] ?? trimmed;
  const options = getUnitOptionsForCategory(category);

  if (options.includes(aliased)) {
    return aliased;
  }

  // Preserve custom units the user typed; only fall back when empty/unknown legacy.
  return aliased;
}
