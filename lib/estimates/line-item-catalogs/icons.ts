import type { LucideIcon } from "lucide-react";
import {
  Bolt,
  Box,
  Briefcase,
  Building2,
  Cable,
  CircleDot,
  Drill,
  Flame,
  Hammer,
  HardHat,
  Layers,
  Lightbulb,
  Package,
  PanelTop,
  Plug,
  Shield,
  Sun,
  Truck,
  Users,
  Wrench,
  Zap,
} from "lucide-react";

import type { PickerCatalogCategory } from "@/lib/estimates/line-item-catalogs/types";

const GROUP_ICONS: Record<string, LucideIcon> = {
  "electrical-roles": Users,
  "wire-cable": Cable,
  "conduit-fittings": Layers,
  "panels-breakers": PanelTop,
  devices: Plug,
  boxes: Box,
  lighting: Lightbulb,
  "safety-misc": Shield,
  "field-equipment": Truck,
  "aerial-lifts": Truck,
  excavation: Drill,
  "material-handling": Package,
  "power-equipment": Bolt,
  "cable-installation": Cable,
  "concrete-construction": Hammer,
  "testing-diagnostics": Wrench,
  "testing-tools": Wrench,
  jobsite: Sun,
  custom: Hammer,
  trades: Briefcase,
  favorites: Zap,
  recents: Bolt,
  company: Building2,
};

const CATEGORY_ICONS: Record<PickerCatalogCategory, LucideIcon> = {
  labor: HardHat,
  materials: Package,
  equipment: Drill,
  subcontractors: Building2,
};

export function getCategoryIcon(category: PickerCatalogCategory) {
  return CATEGORY_ICONS[category];
}

export function getGroupIcon(groupId: string) {
  return GROUP_ICONS[groupId] ?? CircleDot;
}

export function getItemIcon(category: PickerCatalogCategory, groupId?: string) {
  if (groupId && GROUP_ICONS[groupId]) {
    return GROUP_ICONS[groupId];
  }

  return CATEGORY_ICONS[category];
}

export function getSpecialIcon(kind: "favorite" | "recent" | "company" | "custom") {
  if (kind === "favorite") return Zap;
  if (kind === "recent") return Bolt;
  if (kind === "company") return Building2;
  return Hammer;
}

export { Flame, Sun };
