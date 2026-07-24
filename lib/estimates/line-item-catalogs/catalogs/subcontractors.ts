import type { LineItemCatalog } from "@/lib/estimates/line-item-catalogs/types";
import { catalogItem } from "@/lib/estimates/line-item-catalogs/utils";

export const SUBCONTRACTORS_CATALOG: LineItemCatalog = {
  category: "subcontractors",
  label: "Subcontractors",
  groups: [
    {
      id: "trades",
      label: "Trade subcontractors",
      items: [
        catalogItem("HVAC", "ls", ["mechanical"]),
        catalogItem("Plumbing", "ls"),
        catalogItem("Roofing", "ls"),
        catalogItem("Drywall", "ls"),
        catalogItem("Painting", "ls"),
        catalogItem("Concrete", "ls"),
        catalogItem("Framing", "ls"),
        catalogItem("Masonry", "ls"),
        catalogItem("Excavation", "ls", ["excavator"]),
        catalogItem("Landscaping", "ls"),
        catalogItem("Fire Alarm", "ls", ["fa"]),
        catalogItem("Low Voltage", "ls", ["lv"]),
        catalogItem("Data & Communications", "ls", ["data", "comm"]),
        catalogItem("Security Systems", "ls", ["security"]),
        catalogItem("Solar", "ls", ["pv"]),
        catalogItem("Generator Specialist", "ls", ["generator"]),
        catalogItem("Utility Contractor", "ls", ["utility"]),
        catalogItem("Other / Custom", "ls", ["custom"]),
      ],
    },
  ],
};
