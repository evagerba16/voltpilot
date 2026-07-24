import type {
  LineItemCatalog,
  LineItemCatalogGroup,
  LineItemCatalogItem,
} from "@/lib/estimates/line-item-catalogs/types";
import { catalogItem, slugify } from "@/lib/estimates/line-item-catalogs/utils";

type EquipmentUnit = "hrs" | "day" | "wk";

type EquipmentSeed = {
  name: string;
  unit: EquipmentUnit;
  rentalCost: number;
  keywords: string[];
  description: string;
  active?: boolean;
};

function equipmentSeed(
  category: string,
  { name, unit, rentalCost, keywords, description, active = true }: EquipmentSeed
): LineItemCatalogItem {
  return catalogItem(name, unit, keywords, rentalCost, {
    category,
    description,
    isActive: active,
  });
}

function group(id: string, label: string, seeds: EquipmentSeed[]): LineItemCatalogGroup {
  return {
    id,
    label,
    items: seeds.map((seed) => equipmentSeed(label, seed)),
  };
}

export const EQUIPMENT_CATALOG: LineItemCatalog = {
  category: "equipment",
  label: "Equipment",
  groups: [
    group("aerial-lifts", "Aerial Lifts", [
      {
        name: "Bucket Truck",
        unit: "day",
        rentalCost: 650,
        keywords: ["bucket", "boom truck", "utility truck", "aerial"],
        description: "Insulated bucket truck for overhead line work and lighting maintenance.",
      },
      {
        name: "Scissor Lift (19')",
        unit: "day",
        rentalCost: 225,
        keywords: ["scissor", "lift", "genie", "19 foot", "19ft"],
        description: "19-foot electric scissor lift for indoor and slab work.",
      },
      {
        name: "Scissor Lift (32')",
        unit: "day",
        rentalCost: 275,
        keywords: ["scissor", "lift", "genie", "32 foot", "32ft"],
        description: "32-foot scissor lift for medium-height installs and maintenance.",
      },
      {
        name: "Boom Lift (45')",
        unit: "day",
        rentalCost: 450,
        keywords: ["boom", "man lift", "articulating lift", "45 foot", "45ft"],
        description: "45-foot articulating boom lift for exterior conduit and gear installs.",
      },
      {
        name: "Boom Lift (60')",
        unit: "day",
        rentalCost: 575,
        keywords: ["boom", "man lift", "telescopic", "60 foot", "60ft"],
        description: "60-foot telescopic boom lift for high-bay and pole-mounted work.",
      },
    ]),
    group("excavation", "Excavation", [
      {
        name: "Mini Excavator",
        unit: "day",
        rentalCost: 425,
        keywords: ["excavator", "mini ex", "mini-hoe", "trench dig"],
        description: "Compact excavator for trenching, utility potholing, and site prep.",
      },
      {
        name: "Backhoe",
        unit: "day",
        rentalCost: 350,
        keywords: ["backhoe", "loader", "trench"],
        description: "Backhoe loader for trenching and material handling on commercial sites.",
      },
      {
        name: "Trencher",
        unit: "day",
        rentalCost: 275,
        keywords: ["trencher", "ditch witch", "underground"],
        description: "Walk-behind or ride-on trencher for underground conduit runs.",
      },
      {
        name: "Skid Steer",
        unit: "day",
        rentalCost: 325,
        keywords: ["skid steer", "bobcat", "loader"],
        description: "Skid steer with bucket or auger for site mobilization and backfill.",
      },
      {
        name: "Vacuum Excavator",
        unit: "day",
        rentalCost: 650,
        keywords: ["vac truck", "hydrovac", "vacuum excavator", "potholing"],
        description: "Hydro excavation unit for safe daylighting around existing utilities.",
      },
    ]),
    group("material-handling", "Material Handling", [
      {
        name: "Forklift",
        unit: "day",
        rentalCost: 225,
        keywords: ["forklift", "lift truck", "pallet"],
        description: "Warehouse or rough-terrain forklift for gear and material staging.",
      },
      {
        name: "Telehandler",
        unit: "day",
        rentalCost: 375,
        keywords: ["telehandler", "reach forklift", "lull"],
        description: "Telehandler for lifting panels, gear, and reels to elevated platforms.",
      },
      {
        name: "Material Lift",
        unit: "day",
        rentalCost: 95,
        keywords: ["material lift", "drywall lift", "panel lift"],
        description: "Material lift for raising panels, fixtures, and gear to working height.",
      },
      {
        name: "Wire Reel Trailer",
        unit: "day",
        rentalCost: 85,
        keywords: ["reel trailer", "wire trailer", "cable reel"],
        description: "Trailer-mounted reel stand for feeding large conductor pulls.",
      },
    ]),
    group("power-equipment", "Power Equipment", [
      {
        name: "Portable Generator",
        unit: "day",
        rentalCost: 95,
        keywords: ["generator", "genset", "portable gen"],
        description: "Portable generator for temporary power during rough-in and testing.",
      },
      {
        name: "Towable Generator",
        unit: "day",
        rentalCost: 175,
        keywords: ["generator", "genset", "towable", "trailer gen"],
        description: "Towable diesel generator for larger temporary power requirements.",
      },
      {
        name: "Air Compressor",
        unit: "day",
        rentalCost: 75,
        keywords: ["compressor", "air compressor", "pneumatic"],
        description: "Towable air compressor for roto-hammer, bender, and pneumatic tools.",
      },
    ]),
    group("cable-installation", "Cable Installation", [
      {
        name: "Cable Tugger",
        unit: "day",
        rentalCost: 150,
        keywords: ["tugger", "cable puller", "pulling machine"],
        description: "Electric cable tugger for medium and large conductor pulls.",
      },
      {
        name: "Cable Puller",
        unit: "day",
        rentalCost: 125,
        keywords: ["puller", "cable pull", "conduit pull"],
        description: "Portable cable puller for feeder and branch circuit installations.",
      },
      {
        name: "Cable Pulling Sheaves",
        unit: "day",
        rentalCost: 45,
        keywords: ["sheave", "roller", "pulling sheave"],
        description: "Sheave set for routing pulls around bends and obstacles.",
      },
      {
        name: "Hydraulic Conduit Bender",
        unit: "day",
        rentalCost: 120,
        keywords: ["bender", "hydraulic bender", "conduit bender"],
        description: "Hydraulic bender for rigid and IMC conduit bends in the field.",
      },
      {
        name: "Threading Machine",
        unit: "day",
        rentalCost: 95,
        keywords: ["threader", "pipe threader", "rigid thread"],
        description: "Pipe threading machine for rigid conduit and nipple fabrication.",
      },
      {
        name: "Hydraulic Crimper",
        unit: "day",
        rentalCost: 65,
        keywords: ["crimper", "hydraulic crimp", "lug crimp"],
        description: "Hydraulic crimper for compression lugs and large terminations.",
      },
      {
        name: "Knockout Punch Set",
        unit: "day",
        rentalCost: 50,
        keywords: ["ko punch", "knockout", "hole punch"],
        description: "Hydraulic knockout set for panel and enclosure penetrations.",
      },
    ]),
    group("concrete-construction", "Concrete & Construction", [
      {
        name: "Concrete Saw",
        unit: "day",
        rentalCost: 85,
        keywords: ["concrete saw", "cutoff saw", "demo saw"],
        description: "Walk-behind or handheld concrete saw for slab and trench cuts.",
      },
      {
        name: "Core Drill",
        unit: "day",
        rentalCost: 75,
        keywords: ["core drill", "core bit", "hole core"],
        description: "Core drill for precise penetrations through concrete and masonry.",
      },
      {
        name: "Rotary Hammer",
        unit: "day",
        rentalCost: 55,
        keywords: ["roto hammer", "sds", "hammer drill"],
        description: "Rotary hammer for anchor setting and medium-duty masonry drilling.",
      },
      {
        name: "Plate Compactor",
        unit: "day",
        rentalCost: 65,
        keywords: ["compactor", "plate tamper", "backfill"],
        description: "Plate compactor for trench backfill and underground work restoration.",
      },
    ]),
    group("testing-diagnostics", "Testing & Diagnostics", [
      {
        name: "Thermal Camera",
        unit: "day",
        rentalCost: 175,
        keywords: ["thermal", "ir camera", "infrared"],
        description: "Thermal imaging camera for panel inspections and fault finding.",
      },
      {
        name: "Megger Insulation Tester",
        unit: "day",
        rentalCost: 85,
        keywords: ["megger", "insulation tester", "megohmmeter"],
        description: "Insulation resistance tester for feeders and equipment acceptance.",
      },
      {
        name: "Power Quality Analyzer",
        unit: "day",
        rentalCost: 225,
        keywords: ["power quality", "pq analyzer", "harmonics"],
        description: "Power quality analyzer for voltage, harmonics, and load studies.",
      },
      {
        name: "Ground Resistance Tester",
        unit: "day",
        rentalCost: 95,
        keywords: ["ground tester", "fall of potential", "earth resistance"],
        description: "Ground resistance tester for service and equipment grounding verification.",
      },
    ]),
    group("jobsite", "Jobsite", [
      {
        name: "Temporary Lighting Package",
        unit: "day",
        rentalCost: 125,
        keywords: ["temp light", "string lights", "jobsite lighting"],
        description: "Temporary lighting package for safe work in unlit areas.",
      },
      {
        name: "Temporary Power Distribution Box",
        unit: "day",
        rentalCost: 95,
        keywords: ["spider box", "temp power", "power distro"],
        description: "Temporary power distribution center for branch circuit feeds on site.",
      },
      {
        name: "Jobsite Trailer",
        unit: "day",
        rentalCost: 150,
        keywords: ["trailer", "job trailer", "field office"],
        description: "Jobsite trailer for secure tool storage and crew staging.",
      },
      {
        name: "Dumpster",
        unit: "day",
        rentalCost: 350,
        keywords: ["dumpster", "roll off", "debris box"],
        description: "Roll-off dumpster for packaging, scrap, and demo debris.",
      },
    ]),
    {
      id: "custom",
      label: "Custom",
      items: [
        catalogItem("Other / Custom", "day", ["custom", "other"], undefined, {
          category: "Custom",
          description: "Enter a custom equipment rental not listed in the catalog.",
          isActive: true,
        }),
      ],
    },
  ],
};

/** Lookup helper for tests and admin tooling */
export function getEquipmentCatalogItemById(id: string) {
  for (const group of EQUIPMENT_CATALOG.groups) {
    for (const item of group.items) {
      if (item.id === id || slugify(item.name) === id) {
        return item;
      }
    }
  }

  return null;
}

export const EQUIPMENT_CATALOG_ITEM_COUNT = EQUIPMENT_CATALOG.groups.reduce(
  (sum, group) => sum + group.items.filter((item) => item.isActive !== false).length,
  0
);
