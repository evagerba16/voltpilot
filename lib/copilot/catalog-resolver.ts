import { getLineItemCatalog } from "@/lib/estimates/line-item-catalogs";
import {
  getCatalogItemByName,
  searchLineItemCatalog,
} from "@/lib/estimates/line-item-catalogs/search";
import type {
  LineItemCatalog,
  LineItemCatalogItem,
  PickerCatalogCategory,
} from "@/lib/estimates/line-item-catalogs/types";
import { normalizeSearch } from "@/lib/estimates/line-item-catalogs/utils";
import {
  getDefaultUnitForCategory,
  normalizeUnitForCategory,
} from "@/lib/estimates/units";
import type { EstimateCategory } from "@/lib/estimates/types";

export type CatalogMatchSource =
  | "catalog_exact"
  | "catalog_fuzzy"
  | "company_library"
  | "unresolved";

export type CatalogResolverMatch = {
  source: CatalogMatchSource;
  confidence: number;
  matched_name: string | null;
  group_label: string | null;
  catalog_item_id: string | null;
};

export type CatalogResolverInput = {
  category: EstimateCategory;
  description: string;
  quantity?: number;
  unit?: string;
  unit_cost?: number;
  /** Merged catalog (e.g. org equipment). Defaults to static seed catalog. */
  catalog?: LineItemCatalog;
};

export type CatalogResolverResult = {
  category: EstimateCategory;
  description: string;
  quantity: number;
  unit: string;
  unit_cost: number;
  catalog_item_id: string | null;
  org_catalog_item_id: string | null;
  match: CatalogResolverMatch;
  explanation: string;
};

function isPickerCategory(
  category: EstimateCategory
): category is PickerCatalogCategory {
  return (
    category === "labor" ||
    category === "materials" ||
    category === "equipment" ||
    category === "subcontractors"
  );
}

function scoreItemAgainstQuery(
  item: LineItemCatalogItem,
  groupLabel: string,
  query: string
) {
  const normalizedQuery = normalizeSearch(query);
  if (!normalizedQuery) {
    return 0;
  }

  const normalizedName = normalizeSearch(item.name);

  if (normalizedName === normalizedQuery) {
    return 1;
  }

  if (
    normalizedName.includes(normalizedQuery) ||
    normalizedQuery.includes(normalizedName)
  ) {
    return 0.85;
  }

  const keywordHit = (item.keywords ?? []).some((keyword) => {
    const normalizedKeyword = normalizeSearch(keyword);
    return (
      normalizedKeyword.includes(normalizedQuery) ||
      normalizedQuery.includes(normalizedKeyword)
    );
  });

  if (keywordHit) {
    return 0.75;
  }

  const haystacks = [item.description, item.category, groupLabel]
    .filter(Boolean)
    .map((value) => normalizeSearch(String(value)));

  if (haystacks.some((value) => value.includes(normalizedQuery))) {
    return 0.65;
  }

  return 0;
}

function pickBestSearchMatch(
  catalog: LineItemCatalog,
  category: PickerCatalogCategory,
  description: string
) {
  const results = searchLineItemCatalog(catalog, category, description.trim(), {
    favoriteNames: [],
    recentNames: [],
  });

  let best: {
    item: LineItemCatalogItem;
    groupLabel: string;
    score: number;
    isCompany: boolean;
  } | null = null;

  for (const result of results) {
    const score = scoreItemAgainstQuery(
      result.item,
      result.groupLabel,
      description
    );

    if (score <= 0) continue;

    const adjustedScore = result.isCompany ? score + 0.05 : score;

    if (!best || adjustedScore > best.score) {
      best = {
        item: result.item,
        groupLabel: result.groupLabel,
        score: adjustedScore,
        isCompany: Boolean(result.isCompany),
      };
    }
  }

  return best;
}

function buildExplanation(
  description: string,
  match: CatalogResolverMatch,
  unit: string,
  unit_cost: number
) {
  if (match.source === "catalog_exact") {
    return `Matched "${match.matched_name}" in the ${match.group_label ?? "catalog"} with ${unit_cost > 0 ? `$${unit_cost.toLocaleString()} per ${unit}` : "catalog defaults"}.`;
  }

  if (match.source === "catalog_fuzzy") {
    return `Closest catalog match for "${description.trim()}" is "${match.matched_name}" (${Math.round(match.confidence * 100)}% confidence).`;
  }

  if (match.source === "company_library") {
    return `Matched "${match.matched_name}" from your company library.`;
  }

  return `No catalog match found for "${description.trim()}". Using provided values — review unit and cost before applying.`;
}

/**
 * Resolve a free-text line description to catalog defaults (unit, cost, canonical name).
 * Pure function — pass a merged org catalog for equipment when available.
 */
export function resolveCatalogLineItem(
  input: CatalogResolverInput
): CatalogResolverResult {
  const trimmedDescription = input.description.trim();
  const category = input.category;
  const quantity =
    input.quantity != null && Number.isFinite(input.quantity) && input.quantity >= 0
      ? input.quantity
      : 1;

  if (!trimmedDescription || !isPickerCategory(category)) {
    const unit = normalizeUnitForCategory(
      category,
      input.unit || getDefaultUnitForCategory(category)
    );

    return {
      category,
      description: trimmedDescription,
      quantity,
      unit,
      unit_cost:
        input.unit_cost != null && input.unit_cost >= 0 ? input.unit_cost : 0,
      catalog_item_id: null,
      org_catalog_item_id: null,
      match: {
        source: "unresolved",
        confidence: 0,
        matched_name: null,
        group_label: null,
        catalog_item_id: null,
      },
      explanation: trimmedDescription
        ? `No picker catalog exists for ${category} — verify description and pricing manually.`
        : "Description is required to resolve catalog pricing.",
    };
  }

  const catalog = input.catalog ?? getLineItemCatalog(category);
  const exact = getCatalogItemByName(catalog, trimmedDescription);

  if (exact) {
    const unit = normalizeUnitForCategory(
      category,
      input.unit || exact.item.defaultUnit || getDefaultUnitForCategory(category)
    );
    const unit_cost =
      input.unit_cost != null && input.unit_cost > 0
        ? input.unit_cost
        : exact.item.defaultUnitCost ?? 0;

    const match: CatalogResolverMatch = {
      source: "catalog_exact",
      confidence: 1,
      matched_name: exact.item.name,
      group_label: exact.groupLabel,
      catalog_item_id: exact.item.id,
    };

    return {
      category,
      description: exact.item.name,
      quantity,
      unit,
      unit_cost,
      catalog_item_id: exact.item.id,
      org_catalog_item_id: null,
      match,
      explanation: buildExplanation(trimmedDescription, match, unit, unit_cost),
    };
  }

  const fuzzy = pickBestSearchMatch(catalog, category, trimmedDescription);

  if (fuzzy && fuzzy.score >= 0.65) {
    const unit = normalizeUnitForCategory(
      category,
      input.unit || fuzzy.item.defaultUnit || getDefaultUnitForCategory(category)
    );
    const unit_cost =
      input.unit_cost != null && input.unit_cost > 0
        ? input.unit_cost
        : fuzzy.item.defaultUnitCost ?? 0;

    const match: CatalogResolverMatch = {
      source: fuzzy.isCompany ? "company_library" : "catalog_fuzzy",
      confidence: Math.min(fuzzy.score, 0.99),
      matched_name: fuzzy.item.name,
      group_label: fuzzy.groupLabel,
      catalog_item_id: fuzzy.item.id.startsWith("company-")
        ? null
        : fuzzy.item.id,
    };

    return {
      category,
      description: fuzzy.item.name,
      quantity,
      unit,
      unit_cost,
      catalog_item_id: match.catalog_item_id,
      org_catalog_item_id: fuzzy.isCompany ? fuzzy.item.id : null,
      match,
      explanation: buildExplanation(trimmedDescription, match, unit, unit_cost),
    };
  }

  const unit = normalizeUnitForCategory(
    category,
    input.unit || getDefaultUnitForCategory(category)
  );
  const unit_cost =
    input.unit_cost != null && input.unit_cost >= 0 ? input.unit_cost : 0;

  const match: CatalogResolverMatch = {
    source: "unresolved",
    confidence: 0,
    matched_name: null,
    group_label: null,
    catalog_item_id: null,
  };

  return {
    category,
    description: trimmedDescription,
    quantity,
    unit,
    unit_cost,
    catalog_item_id: null,
    org_catalog_item_id: null,
    match,
    explanation: buildExplanation(trimmedDescription, match, unit, unit_cost),
  };
}

/** Batch-resolve line descriptions (e.g. after AI generation). */
export function resolveCatalogLineItems(
  items: CatalogResolverInput[],
  catalogs?: Partial<Record<PickerCatalogCategory, LineItemCatalog>>
) {
  return items.map((item) => {
    const pickerCategory = isPickerCategory(item.category)
      ? item.category
      : null;

    return resolveCatalogLineItem({
      ...item,
      catalog:
        pickerCategory && catalogs?.[pickerCategory]
          ? catalogs[pickerCategory]
          : item.catalog,
    });
  });
}
