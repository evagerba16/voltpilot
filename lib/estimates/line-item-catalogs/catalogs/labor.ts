import type { LineItemCatalog } from "@/lib/estimates/line-item-catalogs/types";
import { catalogItem } from "@/lib/estimates/line-item-catalogs/utils";

export const LABOR_CATALOG: LineItemCatalog = {
  category: "labor",
  label: "Labor",
  groups: [
    {
      id: "electrical-roles",
      label: "Electrical roles",
      items: [
        catalogItem("Master Electrician", "hrs", ["master", "electrician"]),
        catalogItem("Journeyman Electrician", "hrs", ["journeyman", "journeyperson"]),
        catalogItem("Apprentice Electrician", "hrs", ["apprentice"]),
        catalogItem("Lead Electrician", "hrs", ["lead"]),
        catalogItem("Foreman", "hrs", ["foreman", "foreperson"]),
        catalogItem("Residential Electrician", "hrs", ["residential"]),
        catalogItem("Commercial Electrician", "hrs", ["commercial"]),
        catalogItem("Industrial Electrician", "hrs", ["industrial"]),
        catalogItem("Service Electrician", "hrs", ["service tech"]),
        catalogItem("Low Voltage Technician", "hrs", ["low voltage", "lv tech"]),
        catalogItem("Fire Alarm Technician", "hrs", ["fire alarm", "fa"]),
        catalogItem("Security System Technician", "hrs", ["security", "cctv"]),
        catalogItem("Generator Technician", "hrs", ["generator", "gen tech"]),
        catalogItem("Solar Installer", "hrs", ["solar", "pv"]),
        catalogItem("EV Charger Installer", "hrs", ["ev", "evse", "charger"]),
        catalogItem("Controls Technician", "hrs", ["controls", "plc"]),
        catalogItem("Project Manager", "hrs", ["pm"]),
        catalogItem("Superintendent", "hrs", ["super"]),
        catalogItem("Estimator", "hrs", ["estimating"]),
        catalogItem("Helper", "hrs", ["helper", "laborer"]),
        catalogItem("General Laborer", "hrs", ["labor"]),
        catalogItem("Electrical Inspector", "hrs", ["inspector"]),
        catalogItem("Other / Custom", "hrs", ["custom"]),
      ],
    },
  ],
};
