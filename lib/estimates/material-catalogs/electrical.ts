import type { MaterialCatalog } from "@/lib/estimates/material-catalogs/types";

function item(name: string, defaultUnit: string, keywords?: string[]) {
  const id = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  return { id, name, defaultUnit, keywords };
}

export const ELECTRICAL_MATERIAL_CATALOG: MaterialCatalog = {
  tradeId: "electrical",
  tradeLabel: "Electrical",
  groups: [
    {
      id: "wire",
      label: "Wire",
      items: [
        item('14/2 Romex', "lf", ["14-2", "nm-b", "romex"]),
        item('12/2 Romex', "lf", ["12-2", "nm-b", "romex"]),
        item('12/3 Romex', "lf", ["12-3", "nm-b", "romex"]),
        item('10/2 Romex', "lf", ["10-2", "nm-b", "romex"]),
        item('10/3 Romex', "lf", ["10-3", "nm-b", "romex"]),
        item('8/3 Romex', "lf", ["8-3", "nm-b", "romex"]),
        item("6 AWG Copper", "lf", ["6 awg", "wire"]),
        item("4 AWG Copper", "lf", ["4 awg", "wire"]),
        item("THHN Wire", "lf", ["thhn", "stranded"]),
        item("MC Cable", "lf", ["metal clad", "mc"]),
        item("SER Cable", "lf", ["service entrance", "ser"]),
      ],
    },
    {
      id: "conduit",
      label: "Conduit",
      items: [
        item('1/2" EMT', "lf", ["half inch emt", "0.5 emt"]),
        item('3/4" EMT', "lf", ["three quarter emt", "0.75 emt"]),
        item('1" EMT', "lf", ["one inch emt"]),
        item('1¼" EMT', "lf", ["1.25 emt", "1 1/4 emt", "1-1/4 emt"]),
        item("PVC Conduit", "lf", ["pvc", "schedule 40"]),
        item("Flexible Conduit", "lf", ["flex", "greenfield"]),
        item("Liquidtight Conduit", "lf", ["liquid tight", "sealtite"]),
        item("Conduit Coupling", "ea", ["coupling", "emt coupling"]),
        item("Connector", "ea", ["conduit connector", "emt connector"]),
        item("Conduit Strap", "ea", ["strap", "one hole strap"]),
      ],
    },
    {
      id: "electrical-boxes",
      label: "Electrical Boxes",
      items: [
        item("Single Gang Box", "ea", ["1 gang", "switch box"]),
        item("Double Gang Box", "ea", ["2 gang"]),
        item('4" Square Box', "ea", ["4 inch box", "square box"]),
        item("Octagon Box", "ea", ["octo box", "ceiling box"]),
        item("Junction Box", "ea", ["j-box", "pull box"]),
        item("Weatherproof Box", "ea", ["wp box", "outdoor box"]),
        item("Ceiling Fan Box", "ea", ["fan box", "fan rated"]),
      ],
    },
    {
      id: "panels-breakers",
      label: "Panels & Breakers",
      items: [
        item("Main Panel", "ea", ["service panel", "load center"]),
        item("Sub Panel", "ea", ["subpanel", "sub panel"]),
        item("15A Breaker", "ea", ["15 amp breaker"]),
        item("20A Breaker", "ea", ["20 amp breaker"]),
        item("30A Breaker", "ea", ["30 amp breaker"]),
        item("40A Breaker", "ea", ["40 amp breaker"]),
        item("50A Breaker", "ea", ["50 amp breaker"]),
        item("GFCI Breaker", "ea", ["gfci", "ground fault breaker"]),
        item("AFCI Breaker", "ea", ["afci", "arc fault breaker"]),
      ],
    },
    {
      id: "devices",
      label: "Devices",
      items: [
        item("Duplex Outlet", "ea", ["receptacle", "15a outlet"]),
        item("GFCI Outlet", "ea", ["gfci receptacle"]),
        item("USB Outlet", "ea", ["usb receptacle"]),
        item("Single Pole Switch", "ea", ["sp switch", "1p switch"]),
        item("Three Way Switch", "ea", ["3-way switch", "three-way"]),
        item("Four Way Switch", "ea", ["4-way switch", "four-way"]),
        item("Dimmer Switch", "ea", ["dimmer"]),
        item("Smart Switch", "ea", ["wifi switch", "smart device"]),
      ],
    },
    {
      id: "lighting",
      label: "Lighting",
      items: [
        item("LED Can Light", "ea", ["can light", "downlight"]),
        item("Wafer Light", "ea", ["ultra thin", "wafer downlight"]),
        item("Recessed Light", "ea", ["recessed", "can"]),
        item("Ceiling Light", "ea", ["flush mount"]),
        item("Pendant Light", "ea", ["pendant"]),
        item("Exterior Flood Light", "ea", ["flood light", "outdoor light"]),
        item("Shop Light", "ea", ["strip light", "utility light"]),
      ],
    },
    {
      id: "safety-protection",
      label: "Safety & Protection",
      items: [
        item("Smoke Detector", "ea", ["smoke alarm"]),
        item("Carbon Monoxide Detector", "ea", ["co detector", "smoke co combo"]),
        item("Surge Protector", "ea", ["spd", "surge"]),
        item("Disconnect Switch", "ea", ["ac disconnect", "non fused disconnect"]),
        item("Ground Rod", "ea", ["grounding rod"]),
        item("Ground Clamp", "ea", ["acorn clamp", "grounding clamp"]),
      ],
    },
    {
      id: "hardware-misc",
      label: "Hardware & Miscellaneous",
      items: [
        item("Wire Nut", "ea", ["wirenut", "twist on connector"]),
        item("Electrical Tape", "roll", ["vinyl tape"]),
        item("Cable Staple", "box", ["staple", "romex staple"]),
        item("Cable Clamp", "ea", ["romex connector", "nm clamp"]),
        item("Zip Tie", "bag", ["cable tie"]),
        item("Anchors", "box", ["drywall anchor", "toggle bolt"]),
        item("Screws", "box", ["sheet metal screw", "wood screw"]),
        item("Meter Base", "ea", ["meter socket"]),
        item("Transfer Switch", "ea", ["generator transfer"]),
        item("Generator Inlet", "ea", ["power inlet box"]),
        item("EV Charger", "ea", ["evse", "level 2 charger"]),
        item("EV Charger Disconnect", "ea", ["ev disconnect"]),
      ],
    },
  ],
};
