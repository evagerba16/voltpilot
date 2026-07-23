import type { MaterialTradeId } from "@/lib/estimates/material-catalogs/types";

const TRADE_KEYWORDS: Array<{ tradeId: MaterialTradeId; patterns: RegExp[] }> = [
  { tradeId: "plumbing", patterns: [/plumb/i] },
  { tradeId: "hvac", patterns: [/hvac/i, /mechanical/i, /air condition/i] },
  { tradeId: "roofing", patterns: [/roof/i] },
  { tradeId: "concrete", patterns: [/concrete/i, /masonry/i] },
  { tradeId: "framing", patterns: [/fram/i, /carpent/i] },
  { tradeId: "drywall", patterns: [/drywall/i, /gypsum/i] },
  { tradeId: "painting", patterns: [/paint/i] },
  { tradeId: "landscaping", patterns: [/landscape/i, /irrigation/i] },
  { tradeId: "low_voltage", patterns: [/low voltage/i, /low-voltage/i, /security/i, /data/i] },
  { tradeId: "solar", patterns: [/solar/i, /photovoltaic/i, /\bpv\b/i] },
  {
    tradeId: "electrical",
    patterns: [/electrical/i, /electric/i, /power/i, /lighting/i],
  },
];

/** Map project type text to a material catalog trade. Defaults to electrical. */
export function resolveMaterialTradeId(
  projectType: string | null | undefined
): MaterialTradeId {
  const value = projectType?.trim();
  if (!value) {
    return "electrical";
  }

  for (const entry of TRADE_KEYWORDS) {
    if (entry.patterns.some((pattern) => pattern.test(value))) {
      return entry.tradeId;
    }
  }

  return "electrical";
}
