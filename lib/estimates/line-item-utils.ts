import {
  ESTIMATE_CATEGORIES,
  type EstimateCategory,
  type EstimateLineItemInput,
} from "@/lib/estimates/types";
import { getDefaultUnitForCategory } from "@/lib/estimates/units";

export function getLineItemLocalId(item: EstimateLineItemInput, index: number) {
  return item.id ?? `local-${index}`;
}

export function createEmptyLineItem(
  category: EstimateCategory,
  sortOrder: number
): EstimateLineItemInput {
  return {
    id: crypto.randomUUID(),
    category,
    description: "",
    quantity: 0,
    unit: getDefaultUnitForCategory(category),
    unit_cost: 0,
    sort_order: sortOrder,
  };
}

export function normalizeLineItemsByCategory(
  lineItems: EstimateLineItemInput[]
): EstimateLineItemInput[] {
  return ESTIMATE_CATEGORIES.flatMap((category) => {
    const categoryItems = lineItems.filter((item) => item.category === category);
    return categoryItems.map((item, index) => ({
      ...item,
      sort_order: index,
    }));
  });
}

export function reorderCategoryLineItems(
  lineItems: EstimateLineItemInput[],
  category: EstimateCategory,
  fromIndex: number,
  toIndex: number
): EstimateLineItemInput[] {
  const categoryItems = lineItems.filter((item) => item.category === category);
  const reordered = [...categoryItems];
  const [moved] = reordered.splice(fromIndex, 1);

  if (!moved) {
    return lineItems;
  }

  reordered.splice(toIndex, 0, moved);

  const updatedCategoryItems = reordered.map((item, index) => ({
    ...item,
    sort_order: index,
  }));

  return ESTIMATE_CATEGORIES.flatMap((cat) =>
    cat === category
      ? updatedCategoryItems
      : lineItems.filter((item) => item.category === cat)
  );
}

export function moveLineItemsToCategory(
  lineItems: EstimateLineItemInput[],
  localIds: string[],
  targetCategory: EstimateCategory
): EstimateLineItemInput[] {
  const idSet = new Set(localIds);

  const updated = lineItems.map((item, index) => {
    const localId = getLineItemLocalId(item, index);
    if (!idSet.has(localId)) {
      return item;
    }

    return {
      ...item,
      category: targetCategory,
      unit: getDefaultUnitForCategory(targetCategory),
    };
  });

  return normalizeLineItemsByCategory(updated);
}

export function applyBulkMarkupToLineItems(
  lineItems: EstimateLineItemInput[],
  localIds: string[],
  percentIncrease: number
): EstimateLineItemInput[] {
  const idSet = new Set(localIds);
  const multiplier = 1 + percentIncrease / 100;

  return lineItems.map((item, index) => {
    const localId = getLineItemLocalId(item, index);
    if (!idSet.has(localId)) {
      return item;
    }

    return {
      ...item,
      unit_cost: Number((item.unit_cost * multiplier).toFixed(2)),
    };
  });
}

export function removeLineItemsByLocalIds(
  lineItems: EstimateLineItemInput[],
  localIds: string[]
): EstimateLineItemInput[] {
  const idSet = new Set(localIds);

  return normalizeLineItemsByCategory(
    lineItems.filter((item, index) => !idSet.has(getLineItemLocalId(item, index)))
  );
}

export function getAllLineItemLocalIds(lineItems: EstimateLineItemInput[]) {
  return lineItems.map((item, index) => getLineItemLocalId(item, index));
}
