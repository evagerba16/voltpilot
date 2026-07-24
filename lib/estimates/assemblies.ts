import type { EstimateLineItemInput } from "@/lib/estimates/types";
import { getDefaultUnitForCategory } from "@/lib/estimates/units";

export type {
  AssemblyCatalogCategory,
  AssemblyLineItemTemplate,
  EstimateAssembly,
} from "@/lib/estimates/assembly-catalogs/types";

export {
  STANDARD_ASSEMBLIES,
  getStandardAssemblies,
} from "@/lib/estimates/assembly-catalogs/catalog";

/** @deprecated Use STANDARD_ASSEMBLIES from assembly-catalogs */
export { STANDARD_ASSEMBLIES as ELECTRICAL_ASSEMBLIES } from "@/lib/estimates/assembly-catalogs/catalog";

export function buildLineItemsFromAssembly(
  assembly: { items: Array<{
    category: EstimateLineItemInput["category"];
    description: string;
    quantity: number;
    unit?: string;
    unit_cost: number;
  }> },
  startSortOrder = 0
): EstimateLineItemInput[] {
  return assembly.items.map((item, index) => ({
    id: crypto.randomUUID(),
    category: item.category,
    description: item.description,
    quantity: item.quantity,
    unit: item.unit ?? getDefaultUnitForCategory(item.category),
    unit_cost: item.unit_cost,
    sort_order: startSortOrder + index,
  }));
}
