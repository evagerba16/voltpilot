import type { EstimateCategory, EstimateLineItemInput } from "@/lib/estimates/types";
import { getDefaultUnitForCategory } from "@/lib/estimates/units";

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
  items: AssemblyLineItemTemplate[];
};

export const ELECTRICAL_ASSEMBLIES: EstimateAssembly[] = [
  {
    id: "20a-receptacle-circuit",
    name: "20A Receptacle Circuit",
    description: "Typical 20A branch circuit with duplex receptacle",
    items: [
      {
        category: "labor",
        description: "Install 20A receptacle circuit",
        quantity: 4,
        unit: "hrs",
        unit_cost: 85,
      },
      {
        category: "materials",
        description: "12/2 Romex",
        quantity: 50,
        unit: "lf",
        unit_cost: 0.85,
      },
      {
        category: "materials",
        description: "Single Gang Box",
        quantity: 2,
        unit: "ea",
        unit_cost: 1.25,
      },
      {
        category: "materials",
        description: "Duplex Receptacle",
        quantity: 1,
        unit: "ea",
        unit_cost: 3.5,
      },
      {
        category: "materials",
        description: "20A Breaker",
        quantity: 1,
        unit: "ea",
        unit_cost: 12,
      },
      {
        category: "materials",
        description: '1/2" EMT',
        quantity: 10,
        unit: "lf",
        unit_cost: 1.1,
      },
    ],
  },
  {
    id: "lighting-circuit",
    name: "Lighting Circuit",
    description: "15A lighting branch with switch leg",
    items: [
      {
        category: "labor",
        description: "Install lighting circuit with switch",
        quantity: 3.5,
        unit: "hrs",
        unit_cost: 85,
      },
      {
        category: "materials",
        description: "14/2 Romex",
        quantity: 40,
        unit: "lf",
        unit_cost: 0.65,
      },
      {
        category: "materials",
        description: "Single Gang Box",
        quantity: 2,
        unit: "ea",
        unit_cost: 1.25,
      },
      {
        category: "materials",
        description: "Single Pole Switch",
        quantity: 1,
        unit: "ea",
        unit_cost: 2.5,
      },
      {
        category: "materials",
        description: "15A Breaker",
        quantity: 1,
        unit: "ea",
        unit_cost: 10,
      },
    ],
  },
  {
    id: "200a-service-upgrade",
    name: "200A Service Upgrade",
    description: "Main service panel upgrade with meter base",
    items: [
      {
        category: "labor",
        description: "200A service upgrade labor",
        quantity: 16,
        unit: "hrs",
        unit_cost: 95,
      },
      {
        category: "materials",
        description: "Main Panel",
        quantity: 1,
        unit: "ea",
        unit_cost: 450,
      },
      {
        category: "materials",
        description: "2/0 Copper SER",
        quantity: 20,
        unit: "lf",
        unit_cost: 8.5,
      },
      {
        category: "materials",
        description: "Ground Rod",
        quantity: 2,
        unit: "ea",
        unit_cost: 18,
      },
      {
        category: "equipment",
        description: "Trencher rental",
        quantity: 1,
        unit: "day",
        unit_cost: 175,
      },
      {
        category: "subcontractors",
        description: "Utility coordination / meter set",
        quantity: 1,
        unit: "ls",
        unit_cost: 350,
      },
    ],
  },
  {
    id: "ev-charger-circuit",
    name: "EV Charger Circuit",
    description: "50A dedicated circuit for Level 2 EV charger",
    items: [
      {
        category: "labor",
        description: "Install 50A EV charger circuit",
        quantity: 6,
        unit: "hrs",
        unit_cost: 90,
      },
      {
        category: "materials",
        description: "6 AWG Copper",
        quantity: 60,
        unit: "lf",
        unit_cost: 3.25,
      },
      {
        category: "materials",
        description: '3/4" EMT',
        quantity: 30,
        unit: "lf",
        unit_cost: 1.45,
      },
      {
        category: "materials",
        description: "50A Breaker",
        quantity: 1,
        unit: "ea",
        unit_cost: 35,
      },
      {
        category: "materials",
        description: "NEMA 14-50 Receptacle",
        quantity: 1,
        unit: "ea",
        unit_cost: 22,
      },
    ],
  },
];

export function buildLineItemsFromAssembly(
  assembly: EstimateAssembly,
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
