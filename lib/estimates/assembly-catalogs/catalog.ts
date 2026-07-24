import type {
  AssemblyCatalogCategory,
  AssemblyLineItemTemplate,
  EstimateAssembly,
} from "@/lib/estimates/assembly-catalogs/types";

type Item = AssemblyLineItemTemplate;

function L(description: string, quantity: number, unit_cost = 85): Item {
  return { category: "labor", description, quantity, unit: "hrs", unit_cost };
}

function M(description: string, quantity: number, unit: string, unit_cost: number): Item {
  return { category: "materials", description, quantity, unit, unit_cost };
}

function E(description: string, quantity: number, unit_cost: number, unit = "day"): Item {
  return { category: "equipment", description, quantity, unit, unit_cost };
}

function S(description: string, unit_cost: number): Item {
  return { category: "subcontractors", description, quantity: 1, unit: "ls", unit_cost };
}

function assembly(
  id: string,
  name: string,
  category: AssemblyCatalogCategory,
  items: Item[],
  description?: string
): EstimateAssembly {
  return {
    id,
    name,
    category,
    description: description ?? name,
    items,
  };
}

const journeyman = (hours: number, task?: string) =>
  L(task ? `Journeyman Electrician — ${task}` : "Journeyman Electrician", hours, 88);

const apprentice = (hours: number) => L("Apprentice Electrician", hours, 52);

const outletMaterials = (outlet: string, romex = 25): Item[] => [
  M(outlet, 1, "ea", 4.5),
  M("Plastic Box", 1, "ea", 1.35),
  M("Cover Plate", 1, "ea", 1.1),
  M("Wire Nuts", 1, "ea", 0.75),
  M("Romex NM-B 12/2", romex, "lf", 0.82),
  M("Cable Staples", 8, "ea", 0.12),
];

const basicTools: Item[] = [
  E("Ladder", 1, 35, "day"),
  E("Multimeter", 1, 18, "day"),
];

export const STANDARD_ASSEMBLIES: EstimateAssembly[] = [
  assembly(
    "res-duplex-outlet",
    "Install Duplex Outlet",
    "residential",
    [
      journeyman(1, "duplex outlet"),
      ...outletMaterials("Duplex Outlet"),
      ...basicTools,
    ],
    "Standard 20A duplex receptacle with box, device, and homerun allowance."
  ),
  assembly(
    "res-gfci-outlet",
    "Install GFCI Outlet",
    "residential",
    [
      journeyman(1.25, "GFCI outlet"),
      ...outletMaterials("GFCI Outlet", 30),
      ...basicTools,
    ],
    "GFCI protected receptacle for kitchen, bath, garage, or exterior."
  ),
  assembly(
    "res-usb-outlet",
    "Install USB Outlet",
    "residential",
    [
      journeyman(1, "USB outlet"),
      ...outletMaterials("USB Duplex Outlet", 28),
      ...basicTools,
    ]
  ),
  assembly(
    "res-single-pole-switch",
    "Install Single Pole Switch",
    "residential",
    [
      journeyman(0.75, "single pole switch"),
      M("Single Pole Switch", 1, "ea", 2.75),
      M("Plastic Box", 1, "ea", 1.35),
      M("Cover Plate", 1, "ea", 1.1),
      M("Romex NM-B 14/2", 20, "lf", 0.68),
      M("Wire Nuts", 1, "ea", 0.75),
      ...basicTools,
    ]
  ),
  assembly(
    "res-three-way-switch",
    "Install Three-Way Switch",
    "residential",
    [
      journeyman(1.5, "three-way switching"),
      M("Three-Way Switch", 2, "ea", 5.5),
      M("Plastic Box", 2, "ea", 1.35),
      M("Cover Plate", 2, "ea", 1.1),
      M("Romex NM-B 14/3", 35, "lf", 0.95),
      M("Wire Nuts", 1, "ea", 0.75),
      ...basicTools,
    ]
  ),
  assembly(
    "res-ceiling-fan",
    "Install Ceiling Fan",
    "residential",
    [
      journeyman(2, "ceiling fan"),
      apprentice(1),
      M("Ceiling Fan Rated Box", 1, "ea", 8.5),
      M("Ceiling Fan Brace", 1, "ea", 18),
      M("Romex NM-B 14/2", 25, "lf", 0.68),
      M("Wire Nuts", 1, "ea", 0.75),
      E("Ladder", 1, 35, "day"),
      E("Lift / scaffold", 1, 65, "day"),
    ]
  ),
  assembly(
    "res-smoke-detector",
    "Install Smoke Detector",
    "residential",
    [
      journeyman(0.5, "smoke detector"),
      M("Smoke Detector", 1, "ea", 28),
      M("Plastic Box", 1, "ea", 1.35),
      M("Romex NM-B 14/2", 15, "lf", 0.68),
      E("Ladder", 1, 35, "day"),
    ]
  ),
  assembly(
    "res-recessed-led",
    "Install Recessed LED Light",
    "residential",
    [
      journeyman(1, "recessed LED"),
      M("Recessed LED Fixture", 1, "ea", 42),
      M("IC Remodel Housing", 1, "ea", 16),
      M("Romex NM-B 14/2", 20, "lf", 0.68),
      M("Wire Nuts", 1, "ea", 0.75),
      ...basicTools,
    ]
  ),
  assembly(
    "res-exterior-light",
    "Install Exterior Light",
    "residential",
    [
      journeyman(1.25, "exterior light"),
      M("Exterior LED Fixture", 1, "ea", 65),
      M("Weatherproof Box", 1, "ea", 6.5),
      M("In-Use Cover", 1, "ea", 14),
      M("Romex NM-B 12/2", 30, "lf", 0.82),
      ...basicTools,
    ]
  ),
  assembly(
    "res-panel-upgrade",
    "Install Electrical Panel Upgrade",
    "residential",
    [
      journeyman(16, "200A panel upgrade"),
      apprentice(8),
      M("200A Main Panel", 1, "ea", 480),
      M("200A Main Breaker", 1, "ea", 95),
      M("Ground Rod", 2, "ea", 18),
      M("Ground Wire #6", 20, "lf", 1.85),
      M("2/0 Copper SER", 25, "lf", 8.5),
      E("Trencher rental", 1, 175, "day"),
      S("Utility coordination / meter set", 350),
    ],
    "200A service upgrade with panel, grounding, and utility coordination."
  ),
  assembly(
    "res-sub-panel",
    "Install Sub Panel",
    "residential",
    [
      journeyman(8, "sub panel"),
      M("100A Sub Panel", 1, "ea", 185),
      M("100A Breaker", 1, "ea", 55),
      M("4/0 AL Feeder", 40, "lf", 4.2),
      M("1-1/4\" EMT", 30, "lf", 2.1),
      ...basicTools,
    ]
  ),
  assembly(
    "res-ev-charger",
    "Install EV Charger",
    "residential",
    [
      journeyman(6, "EV charger circuit"),
      M("50A Breaker", 1, "ea", 35),
      M("6 AWG Copper", 60, "lf", 3.25),
      M("3/4\" EMT", 30, "lf", 1.45),
      M("NEMA 14-50 Receptacle", 1, "ea", 22),
      ...basicTools,
    ],
    "50A dedicated circuit for Level 2 EV charger."
  ),
  assembly(
    "res-surge-protector",
    "Install Whole Home Surge Protector",
    "residential",
    [
      journeyman(1.5, "whole home surge"),
      M("Whole Home Surge Protector", 1, "ea", 145),
      M("Dedicated 20A Breaker", 1, "ea", 12),
      ...basicTools,
    ]
  ),
  assembly(
    "res-generator-transfer",
    "Install Generator Transfer Switch",
    "residential",
    [
      journeyman(10, "generator transfer switch"),
      M("Manual Transfer Switch", 1, "ea", 420),
      M("Inlet Box", 1, "ea", 85),
      M("6 AWG Copper", 40, "lf", 3.25),
      M("1\" EMT", 35, "lf", 2.45),
      ...basicTools,
    ]
  ),

  assembly(
    "com-led-panel-light",
    "Install LED Panel Light",
    "commercial",
    [
      journeyman(1.5, "LED panel light"),
      M("2x4 LED Panel", 1, "ea", 125),
      M("Grid Support Clips", 4, "ea", 2.5),
      M("MC Cable 12/2", 30, "lf", 1.35),
      E("Lift / scaffold", 1, 85, "day"),
    ]
  ),
  assembly(
    "com-high-bay",
    "Install High Bay Fixture",
    "commercial",
    [
      journeyman(2.5, "high bay fixture"),
      apprentice(1),
      M("LED High Bay Fixture", 1, "ea", 285),
      M("Pendant Mount Kit", 1, "ea", 35),
      M("MC Cable 10/3", 40, "lf", 2.1),
      E("Scissor lift", 1, 225, "day"),
    ]
  ),
  assembly(
    "com-exit-sign",
    "Install Exit Sign",
    "commercial",
    [
      journeyman(1, "exit sign"),
      M("LED Exit Sign", 1, "ea", 95),
      M("J-Box", 1, "ea", 2.5),
      M("MC Cable 12/2", 20, "lf", 1.35),
      ...basicTools,
    ]
  ),
  assembly(
    "com-emergency-light",
    "Install Emergency Light",
    "commercial",
    [
      journeyman(1, "emergency light"),
      M("Emergency Light Combo", 1, "ea", 110),
      M("J-Box", 1, "ea", 2.5),
      M("MC Cable 12/2", 20, "lf", 1.35),
      ...basicTools,
    ]
  ),
  assembly(
    "com-disconnect",
    "Install Disconnect Switch",
    "commercial",
    [
      journeyman(2, "disconnect switch"),
      M("60A Fused Disconnect", 1, "ea", 145),
      M("3/4\" EMT", 20, "lf", 1.45),
      M("10 AWG THHN", 40, "lf", 0.55),
      ...basicTools,
    ]
  ),
  assembly(
    "com-circuit",
    "Install Circuit",
    "commercial",
    [
      journeyman(4, "commercial branch circuit"),
      M("20A Breaker", 1, "ea", 14),
      M("3/4\" EMT", 45, "lf", 1.45),
      M("12 AWG THHN", 120, "lf", 0.42),
      M("J-Box", 2, "ea", 2.5),
      ...basicTools,
    ],
    "Typical 20A commercial branch circuit in EMT."
  ),
  assembly(
    "com-distribution-panel",
    "Install Distribution Panel",
    "commercial",
    [
      journeyman(12, "distribution panel"),
      apprentice(6),
      M("225A Distribution Panel", 1, "ea", 980),
      M("225A Main Breaker", 1, "ea", 420),
      M("3\" EMT", 25, "lf", 6.5),
      M("2/0 Copper", 40, "lf", 8.5),
      E("Lift / scaffold", 1, 225, "day"),
    ]
  ),

  assembly(
    "lv-cat6-drop",
    "Install CAT6 Drop",
    "low_voltage",
    [
      journeyman(1.25, "CAT6 drop"),
      M("CAT6 Cable", 100, "lf", 0.28),
      M("RJ45 Keystone Jack", 1, "ea", 4.5),
      M("Low Voltage Ring", 1, "ea", 0.85),
      M("Faceplate", 1, "ea", 2.25),
      E("Cable tester", 1, 15, "day"),
    ]
  ),
  assembly(
    "lv-security-camera",
    "Install Security Camera",
    "low_voltage",
    [
      journeyman(2, "security camera"),
      M("IP Security Camera", 1, "ea", 185),
      M("CAT6 Cable", 120, "lf", 0.28),
      M("Camera Mount", 1, "ea", 18),
      M("Weatherproof Fitting", 1, "ea", 8.5),
      E("Ladder", 1, 35, "day"),
    ]
  ),
  assembly(
    "lv-access-control",
    "Install Access Control Device",
    "low_voltage",
    [
      journeyman(3, "access control"),
      M("Card Reader", 1, "ea", 245),
      M("Electric Strike", 1, "ea", 125),
      M("18/6 Security Cable", 80, "lf", 0.35),
      M("CAT6 Cable", 60, "lf", 0.28),
      S("Door hardware coordination", 175),
    ]
  ),
  assembly(
    "lv-fire-alarm",
    "Install Fire Alarm Device",
    "low_voltage",
    [
      journeyman(1.5, "fire alarm device"),
      M("Smoke Detector (FA)", 1, "ea", 65),
      M("Red Fire Alarm Cable", 80, "lf", 0.48),
      M("4S Box", 1, "ea", 3.25),
      E("Lift / ladder", 1, 35, "day"),
    ]
  ),
];

export function getStandardAssemblies(category?: AssemblyCatalogCategory) {
  if (!category || category === "company") {
    return STANDARD_ASSEMBLIES;
  }

  return STANDARD_ASSEMBLIES.filter((assembly) => assembly.category === category);
}
