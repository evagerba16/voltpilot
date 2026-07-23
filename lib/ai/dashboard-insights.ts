import { getOpenAIClient } from "@/lib/ai/client";
import { getOpenAIConfig } from "@/lib/ai/env";
import { parseJsonResponse } from "@/lib/ai/parse-json";
import type { DashboardInsightItem, DashboardInsightsData } from "@/lib/ai/types";
import { reviewEstimate } from "@/lib/estimates/review";
import type { EstimateBuilderState } from "@/lib/estimates/types";
import { createClient } from "@/lib/supabase/server";

type EstimateRow = {
  id: string;
  title: string;
  status: string;
  notes: string | null;
  grand_total: number | null;
  selling_price: number | null;
  gross_margin_percent: number | null;
  profit_margin_percent: number | null;
  overhead_percent: number | null;
  contingency_percent: number | null;
  tax_percent: number | null;
  project: {
    id: string;
    project_name: string;
    status: string;
    customer: { company_name: string } | { company_name: string }[] | null;
  } | {
    id: string;
    project_name: string;
    status: string;
    customer: { company_name: string } | { company_name: string }[] | null;
  }[] | null;
  line_items?: Array<{
    category: string;
    description: string;
    quantity: number;
    unit: string;
    unit_cost: number;
    sort_order: number;
  }>;
};

function parseNumber(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value);
  return 0;
}

function normalizeProject(project: EstimateRow["project"]) {
  if (Array.isArray(project)) {
    return project[0] ?? null;
  }

  return project;
}

function normalizeCustomer(
  customer: { company_name: string } | { company_name: string }[] | null | undefined
) {
  if (Array.isArray(customer)) {
    return customer[0]?.company_name ?? "Unknown customer";
  }

  return customer?.company_name ?? "Unknown customer";
}

function estimateToBuilderState(estimate: EstimateRow): EstimateBuilderState {
  return {
    title: estimate.title,
    notes: estimate.notes ?? "",
    overhead_percent: parseNumber(estimate.overhead_percent),
    contingency_percent: parseNumber(estimate.contingency_percent),
    profit_margin_percent: parseNumber(estimate.profit_margin_percent),
    tax_percent: parseNumber(estimate.tax_percent),
    line_items: (estimate.line_items ?? []).map((item, index) => ({
      category: item.category as EstimateBuilderState["line_items"][number]["category"],
      description: item.description,
      quantity: parseNumber(item.quantity),
      unit: item.unit,
      unit_cost: parseNumber(item.unit_cost),
      sort_order: item.sort_order ?? index,
    })),
  };
}

function buildDashboardItems(estimates: EstimateRow[]): DashboardInsightItem[] {
  const items: DashboardInsightItem[] = [];

  for (const estimate of estimates) {
    const project = normalizeProject(estimate.project);
    if (!project) continue;

    const customerName = normalizeCustomer(project.customer);
    const margin = parseNumber(
      estimate.gross_margin_percent ?? estimate.profit_margin_percent
    );
    const total = parseNumber(estimate.selling_price ?? estimate.grand_total);
    const state = estimateToBuilderState(estimate);
    const review = reviewEstimate(state);
    const criticalCount = review.suggestions.filter(
      (item) => item.severity === "critical"
    ).length;
    const warningCount = review.suggestions.filter(
      (item) => item.severity === "warning"
    ).length;

    if (criticalCount > 0 || warningCount >= 2) {
      items.push({
        id: `review-${estimate.id}`,
        type: "review_required",
        severity: criticalCount > 0 ? "critical" : "warning",
        title: `"${estimate.title}" needs review`,
        description: `${criticalCount} critical and ${warningCount} warning item(s) detected by AI review.`,
        href: `/estimates/${estimate.id}`,
        entityLabel: `${customerName} · ${project.project_name}`,
      });
    }

    if (margin > 0 && margin < 8) {
      items.push({
        id: `margin-${estimate.id}`,
        type: "low_margin",
        severity: margin < 5 ? "critical" : "warning",
        title: `Low margin on "${estimate.title}"`,
        description: `${margin.toFixed(1)}% gross margin — review markup before sending.`,
        href: `/estimates/${estimate.id}`,
        entityLabel: `${customerName} · ${project.project_name}`,
      });
    }

    if (total > 25000 && !estimate.notes?.trim()) {
      items.push({
        id: `missing-${estimate.id}`,
        type: "missing_info",
        severity: "warning",
        title: `Missing assumptions on "${estimate.title}"`,
        description:
          "Add exclusions, allowances, and site condition notes before proposal generation.",
        href: `/estimates/${estimate.id}`,
        entityLabel: `${customerName} · ${project.project_name}`,
      });
    }

    if (criticalCount >= 2 || (total > 100000 && margin < 10)) {
      items.push({
        id: `risk-${estimate.id}`,
        type: "high_risk",
        severity: "critical",
        title: `High-risk estimate: "${estimate.title}"`,
        description:
          "Multiple critical flags or thin margin on a large bid. Senior review recommended.",
        href: `/estimates/${estimate.id}`,
        entityLabel: `${customerName} · ${project.project_name}`,
      });
    }

    if (
      estimate.status === "Draft" &&
      total > 0 &&
      project.status === "Estimating"
    ) {
      items.push({
        id: `action-${estimate.id}`,
        type: "recommended_action",
        severity: "info",
        title: `Generate proposal for "${estimate.title}"`,
        description:
          "Estimate pricing is complete. Consider generating a client-ready proposal.",
        href: `/estimates/${estimate.id}`,
        entityLabel: `${customerName} · ${project.project_name}`,
      });
    }
  }

  const severityRank = { critical: 0, warning: 1, info: 2 };
  const unique = new Map<string, DashboardInsightItem>();

  for (const item of items) {
    unique.set(item.id, item);
  }

  return Array.from(unique.values())
    .sort((a, b) => severityRank[a.severity] - severityRank[b.severity])
    .slice(0, 20);
}

type AiSummaryPayload = {
  summary?: string;
  actions?: string[];
};

export async function getDashboardInsights(
  organizationId: string
): Promise<DashboardInsightsData> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("estimates")
    .select(
      `
        id,
        title,
        status,
        notes,
        grand_total,
        selling_price,
        gross_margin_percent,
        profit_margin_percent,
        overhead_percent,
        contingency_percent,
        tax_percent,
        project:projects!inner (
          id,
          project_name,
          status,
          customer:customers!inner ( company_name )
        ),
        line_items:estimate_line_items (
          category,
          description,
          quantity,
          unit,
          unit_cost,
          sort_order
        )
      `
    )
    .eq("organization_id", organizationId)
    .order("updated_at", { ascending: false })
    .limit(40);

  if (error) {
    throw new Error(error.message);
  }

  const estimates = (data ?? []) as EstimateRow[];
  const items = buildDashboardItems(estimates);
  const counts = {
    reviewRequired: items.filter((item) => item.type === "review_required").length,
    lowMargin: items.filter((item) => item.type === "low_margin").length,
    missingInfo: items.filter((item) => item.type === "missing_info").length,
    highRisk: items.filter((item) => item.type === "high_risk").length,
    recommendedActions: items.filter(
      (item) => item.type === "recommended_action"
    ).length,
  };

  const defaultSummary =
    items.length === 0
      ? "Your portfolio looks healthy. No estimates currently require urgent AI review."
      : `${counts.reviewRequired} estimate(s) need review, ${counts.highRisk} high-risk, and ${counts.recommendedActions} recommended action(s).`;

  const { isConfigured } = getOpenAIConfig();

  if (!isConfigured || items.length === 0) {
    return {
      items,
      summary: defaultSummary,
      counts,
      aiEnabled: isConfigured,
      source: "rules",
    };
  }

  const client = getOpenAIClient();

  if (!client) {
    return {
      items,
      summary: defaultSummary,
      counts,
      aiEnabled: false,
      source: "rules",
    };
  }

  try {
    const { model } = getOpenAIConfig();
    const completion = await client.chat.completions.create({
      model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are VoltPilot AI summarizing portfolio insights for an electrical contractor.",
        },
        {
          role: "user",
          content: `Summarize these portfolio insights in 1-2 sentences and suggest up to 3 priority actions.

Counts:
- Review required: ${counts.reviewRequired}
- Low margin: ${counts.lowMargin}
- Missing info: ${counts.missingInfo}
- High risk: ${counts.highRisk}
- Recommended actions: ${counts.recommendedActions}

Top items:
${items
  .slice(0, 8)
  .map((item) => `- [${item.severity}] ${item.title}: ${item.description}`)
  .join("\n")}

Return JSON: { "summary": "...", "actions": ["...", "..."] }`,
        },
      ],
    });

    const content = completion.choices[0]?.message?.content ?? "";
    const parsed = parseJsonResponse<AiSummaryPayload>(content);

    if (parsed?.actions?.length) {
      parsed.actions.slice(0, 3).forEach((action, index) => {
        if (!action.trim()) return;

        items.unshift({
          id: `ai-action-${index}`,
          type: "recommended_action",
          severity: "info",
          title: "AI recommended action",
          description: action.trim(),
          href: "/dashboard",
          entityLabel: "Portfolio",
        });
      });
    }

    return {
      items: items.slice(0, 20),
      summary: parsed?.summary?.trim() ?? defaultSummary,
      counts,
      aiEnabled: true,
      source: parsed?.summary ? "hybrid" : "rules",
    };
  } catch {
    return {
      items,
      summary: defaultSummary,
      counts,
      aiEnabled: true,
      source: "rules",
    };
  }
}
