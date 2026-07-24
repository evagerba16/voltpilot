import type { EstimateCategory } from "@/lib/estimates/types";

export type AssemblyCatalogCategory =
  | "residential"
  | "commercial"
  | "low_voltage"
  | "company";

export type AssemblyLineItemTemplate = {
  category: EstimateCategory;
  description: string;
  quantity: number;
  unit?: string;
  unit_cost: number;
};

export type EstimateAssembly = {
  id: string;
  name: string;
  description: string;
  category: AssemblyCatalogCategory;
  items: AssemblyLineItemTemplate[];
  isCompany?: boolean;
};

export type AssemblySearchResult = {
  assembly: EstimateAssembly;
  source: "favorite" | "recent" | "catalog" | "company";
  score: number;
};

export const ASSEMBLY_CATEGORY_LABELS: Record<AssemblyCatalogCategory, string> = {
  residential: "Residential",
  commercial: "Commercial",
  low_voltage: "Low Voltage",
  company: "Company",
};

export const ASSEMBLY_CATEGORY_ORDER: AssemblyCatalogCategory[] = [
  "residential",
  "commercial",
  "low_voltage",
  "company",
];

export function groupAssemblyItems(items: AssemblyLineItemTemplate[]) {
  return {
    labor: items.filter((item) => item.category === "labor"),
    materials: items.filter((item) => item.category === "materials"),
    equipment: items.filter((item) => item.category === "equipment"),
    subcontractors: items.filter((item) => item.category === "subcontractors"),
    miscellaneous: items.filter((item) => item.category === "miscellaneous"),
  };
}

export function assemblyDirectCost(assembly: EstimateAssembly) {
  return assembly.items.reduce(
    (sum, item) => sum + item.quantity * item.unit_cost,
    0
  );
}
