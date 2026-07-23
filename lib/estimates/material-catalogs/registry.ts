import { ELECTRICAL_MATERIAL_CATALOG } from "@/lib/estimates/material-catalogs/electrical";
import type {
  MaterialCatalog,
  MaterialTradeId,
} from "@/lib/estimates/material-catalogs/types";

const EMPTY_CATALOG = (tradeId: MaterialTradeId, tradeLabel: string): MaterialCatalog => ({
  tradeId,
  tradeLabel,
  groups: [],
});

/** Central registry — add trade catalogs here as they are built. */
export const MATERIAL_CATALOG_REGISTRY: Partial<
  Record<MaterialTradeId, MaterialCatalog>
> = {
  electrical: ELECTRICAL_MATERIAL_CATALOG,
};

const TRADE_LABELS: Record<MaterialTradeId, string> = {
  electrical: "Electrical",
  plumbing: "Plumbing",
  hvac: "HVAC",
  roofing: "Roofing",
  concrete: "Concrete",
  framing: "Framing",
  drywall: "Drywall",
  painting: "Painting",
  landscaping: "Landscaping",
  low_voltage: "Low Voltage",
  solar: "Solar",
};

export function getMaterialCatalog(tradeId: MaterialTradeId): MaterialCatalog {
  return (
    MATERIAL_CATALOG_REGISTRY[tradeId] ??
    EMPTY_CATALOG(tradeId, TRADE_LABELS[tradeId])
  );
}
