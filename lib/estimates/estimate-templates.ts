import type { EstimateBuilderState } from "@/lib/estimates/types";

const STORAGE_KEY = "voltpilot:estimate-templates";
const MAX_TEMPLATES = 20;

export type EstimateTemplateSnapshot = Pick<
  EstimateBuilderState,
  | "overhead_percent"
  | "contingency_percent"
  | "profit_margin_percent"
  | "tax_percent"
  | "line_items"
>;

export type EstimateTemplate = {
  id: string;
  name: string;
  createdAt: number;
  snapshot: EstimateTemplateSnapshot;
};

function readTemplates(): EstimateTemplate[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as EstimateTemplate[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeTemplates(templates: EstimateTemplate[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
}

export function listEstimateTemplates(): EstimateTemplate[] {
  return readTemplates().sort((a, b) => b.createdAt - a.createdAt);
}

export function saveEstimateTemplate(
  name: string,
  snapshot: EstimateTemplateSnapshot
): EstimateTemplate {
  const trimmed = name.trim();
  const template: EstimateTemplate = {
    id: crypto.randomUUID(),
    name: trimmed,
    createdAt: Date.now(),
    snapshot: {
      ...snapshot,
      line_items: snapshot.line_items.map((item) => ({
        ...item,
        id: crypto.randomUUID(),
      })),
    },
  };

  writeTemplates([template, ...readTemplates()].slice(0, MAX_TEMPLATES));
  return template;
}

export function deleteEstimateTemplate(templateId: string) {
  writeTemplates(readTemplates().filter((template) => template.id !== templateId));
}

export function buildStateFromTemplate(
  current: EstimateBuilderState,
  template: EstimateTemplate
): EstimateBuilderState {
  return {
    ...current,
    overhead_percent: template.snapshot.overhead_percent,
    contingency_percent: template.snapshot.contingency_percent,
    profit_margin_percent: template.snapshot.profit_margin_percent,
    tax_percent: template.snapshot.tax_percent,
    line_items: template.snapshot.line_items.map((item, index) => ({
      ...item,
      id: crypto.randomUUID(),
      sort_order: index,
    })),
  };
}
