import { getOpenAIClient } from "@/lib/ai/client";
import { getOpenAIConfig } from "@/lib/ai/env";
import { parseJsonResponse } from "@/lib/ai/parse-json";
import type { ProjectInsight, ProjectInsightsResult } from "@/lib/ai/types";
import { createClient } from "@/lib/supabase/server";

type ProjectRecord = {
  id: string;
  project_name: string;
  project_type: string | null;
  status: string;
  estimated_value: number | null;
  notes: string | null;
  customer: { company_name: string } | { company_name: string }[] | null;
};

type EstimateRecord = {
  id: string;
  title: string;
  status: string;
  grand_total: number | null;
  selling_price: number | null;
  gross_margin_percent: number | null;
  profit_margin_percent: number | null;
  notes: string | null;
};

function normalizeCustomer(customer: ProjectRecord["customer"]) {
  if (Array.isArray(customer)) {
    return customer[0]?.company_name ?? "Unknown customer";
  }

  return customer?.company_name ?? "Unknown customer";
}

function parseNumber(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value);
  return 0;
}

function complexityFromEstimates(estimates: EstimateRecord[]) {
  if (estimates.length === 0) {
    return { score: 2, label: "Low" };
  }

  const totalValue = estimates.reduce(
    (sum, estimate) =>
      sum + parseNumber(estimate.selling_price ?? estimate.grand_total),
    0
  );
  const avgMargin =
    estimates.reduce(
      (sum, estimate) =>
        sum +
        parseNumber(estimate.gross_margin_percent ?? estimate.profit_margin_percent),
      0
    ) / estimates.length;

  let score = 3;

  if (totalValue > 500000) score += 2;
  else if (totalValue > 150000) score += 1;

  if (estimates.length >= 3) score += 1;
  if (avgMargin < 8) score += 1;

  if (score >= 7) return { score, label: "High" };
  if (score >= 5) return { score, label: "Moderate" };
  return { score, label: "Low" };
}

function buildRuleInsights(
  project: ProjectRecord,
  estimates: EstimateRecord[]
): ProjectInsight[] {
  const insights: ProjectInsight[] = [];
  const customerName = normalizeCustomer(project.customer);

  if (estimates.length === 0) {
    insights.push({
      id: "no-estimates",
      category: "action",
      severity: "warning",
      title: "No estimates linked",
      description:
        "This project has no estimates yet. Create an estimate to quantify scope and pricing.",
    });
  }

  for (const estimate of estimates) {
    const margin = parseNumber(
      estimate.gross_margin_percent ?? estimate.profit_margin_percent
    );
    const total = parseNumber(estimate.selling_price ?? estimate.grand_total);

    if (margin > 0 && margin < 8) {
      insights.push({
        id: `low-margin-${estimate.id}`,
        category: "profitability",
        severity: "critical",
        title: `Low margin on "${estimate.title}"`,
        description: `${margin.toFixed(1)}% gross margin may not cover buyout variance and field changes. Review overhead, contingency, and profit before bidding.`,
      });
    }

    if (total > 50000 && !estimate.notes?.trim()) {
      insights.push({
        id: `missing-notes-${estimate.id}`,
        category: "cost_risk",
        severity: "warning",
        title: `Missing assumptions on "${estimate.title}"`,
        description:
          "Large estimates without documented assumptions increase dispute risk. Add exclusions, allowances, and site conditions.",
      });
    }

    if (total === 0 && estimate.status === "Draft") {
      insights.push({
        id: `incomplete-${estimate.id}`,
        category: "pricing",
        severity: "warning",
        title: `"${estimate.title}" is incomplete`,
        description:
          "This draft estimate has no sell price. Complete line items and markup before proposal generation.",
      });
    }
  }

  const values = estimates
    .map((estimate) => parseNumber(estimate.selling_price ?? estimate.grand_total))
    .filter((value) => value > 0);

  if (values.length >= 2) {
    const min = Math.min(...values);
    const max = Math.max(...values);

    if (max / min >= 2.5) {
      insights.push({
        id: "pricing-spread",
        category: "pricing",
        severity: "info",
        title: "Estimate values vary significantly",
        description:
          "Linked estimates have a wide price spread. Confirm alternates, phasing, or scope differences are intentional.",
      });
    }
  }

  if (project.status === "Estimating" && estimates.length > 0) {
    insights.push({
      id: "ready-for-proposal",
      category: "action",
      severity: "info",
      title: "Consider generating a proposal",
      description: `${customerName} — ${project.project_name} has estimate data ready for proposal drafting and client review.`,
    });
  }

  return insights;
}

type AiInsightsPayload = {
  summary?: string;
  insights?: Array<{
    category?: string;
    severity?: string;
    title?: string;
    description?: string;
  }>;
};

export async function getProjectInsights(
  projectId: string,
  organizationId: string
): Promise<ProjectInsightsResult> {
  const supabase = await createClient();

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select(
      `
        id,
        project_name,
        project_type,
        status,
        estimated_value,
        notes,
        customer:customers!inner ( company_name )
      `
    )
    .eq("id", projectId)
    .eq("organization_id", organizationId)
    .single();

  if (projectError || !project) {
    throw new Error(projectError?.message ?? "Project not found");
  }

  const { data: estimates } = await supabase
    .from("estimates")
    .select(
      "id, title, status, grand_total, selling_price, gross_margin_percent, profit_margin_percent, notes"
    )
    .eq("project_id", projectId)
    .eq("organization_id", organizationId)
    .order("updated_at", { ascending: false });

  const projectRecord = project as ProjectRecord;
  const estimateRecords = (estimates ?? []) as EstimateRecord[];
  const complexity = complexityFromEstimates(estimateRecords);
  const ruleInsights = buildRuleInsights(projectRecord, estimateRecords);
  const { isConfigured } = getOpenAIConfig();

  if (!isConfigured) {
    return {
      complexityScore: complexity.score,
      complexityLabel: complexity.label,
      insights: ruleInsights,
      summary: `${projectRecord.project_name} has ${estimateRecords.length} estimate(s). Review flagged items before bidding.`,
      source: "rules",
      aiEnabled: false,
    };
  }

  const client = getOpenAIClient();

  if (!client) {
    return {
      complexityScore: complexity.score,
      complexityLabel: complexity.label,
      insights: ruleInsights,
      summary: `${projectRecord.project_name} has ${estimateRecords.length} estimate(s). Review flagged items before bidding.`,
      source: "rules",
      aiEnabled: false,
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
            "You are VoltPilot AI analyzing commercial electrical projects. Provide insights and recommendations only.",
        },
        {
          role: "user",
          content: `Analyze this project and return JSON:
{
  "summary": "1-2 sentence summary",
  "insights": [
    {
      "category": "complexity|cost_risk|profitability|pricing|action",
      "severity": "info|warning|critical",
      "title": "Short title",
      "description": "Actionable insight"
    }
  ]
}

Project: ${projectRecord.project_name}
Type: ${projectRecord.project_type ?? "Commercial"}
Status: ${projectRecord.status}
Customer: ${normalizeCustomer(projectRecord.customer)}
Estimates: ${estimateRecords.length}
Estimated value: $${parseNumber(projectRecord.estimated_value).toFixed(0)}

Estimate details:
${estimateRecords
  .map(
    (estimate) =>
      `- ${estimate.title}: $${parseNumber(estimate.selling_price ?? estimate.grand_total).toFixed(0)}, margin ${parseNumber(estimate.gross_margin_percent ?? estimate.profit_margin_percent).toFixed(1)}%, status ${estimate.status}`
  )
  .join("\n")}

Focus on complexity, cost risks, profitability opportunities, and pricing inconsistencies. Return 2-5 insights.`,
        },
      ],
    });

    const content = completion.choices[0]?.message?.content ?? "";
    const parsed = parseJsonResponse<AiInsightsPayload>(content);

    const aiInsights: ProjectInsight[] = (parsed?.insights ?? [])
      .map((item, index) => {
        if (!item.title?.trim() || !item.description?.trim()) return null;

        const category =
          item.category === "complexity" ||
          item.category === "cost_risk" ||
          item.category === "profitability" ||
          item.category === "pricing" ||
          item.category === "action"
            ? item.category
            : "action";
        const severity =
          item.severity === "critical" ||
          item.severity === "warning" ||
          item.severity === "info"
            ? item.severity
            : "info";

        return {
          id: `ai-insight-${index}`,
          category,
          severity,
          title: item.title.trim(),
          description: item.description.trim(),
        };
      })
      .filter((item): item is ProjectInsight => item !== null);

    const merged = [...ruleInsights];
    const seen = new Set(ruleInsights.map((item) => item.title.toLowerCase()));

    for (const insight of aiInsights) {
      const key = insight.title.toLowerCase();
      if (!seen.has(key)) {
        merged.push(insight);
        seen.add(key);
      }
    }

    return {
      complexityScore: complexity.score,
      complexityLabel: complexity.label,
      insights: merged,
      summary:
        parsed?.summary?.trim() ??
        `${projectRecord.project_name} complexity is ${complexity.label.toLowerCase()}. Review ${merged.length} insight(s) before bidding.`,
      source: aiInsights.length > 0 ? "hybrid" : "rules",
      aiEnabled: true,
    };
  } catch {
    return {
      complexityScore: complexity.score,
      complexityLabel: complexity.label,
      insights: ruleInsights,
      summary: `${projectRecord.project_name} has ${estimateRecords.length} estimate(s). Review flagged items before bidding.`,
      source: "rules",
      aiEnabled: true,
    };
  }
}
