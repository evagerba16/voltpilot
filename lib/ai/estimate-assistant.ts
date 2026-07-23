import { getOpenAIClient } from "@/lib/ai/client";
import { getOpenAIConfig } from "@/lib/ai/env";
import { parseJsonResponse } from "@/lib/ai/parse-json";
import type {
  AiEstimateAssistantContext,
  AiEstimateAssistantPayload,
  AiEstimateAssistantRecommendation,
  AiEstimateLineItemRecommendation,
  AiEstimateMarkupRecommendation,
} from "@/lib/ai/types";
import { calculateEstimateTotals } from "@/lib/estimates/calculations";
import { reviewEstimate } from "@/lib/estimates/review";
import {
  ESTIMATE_CATEGORIES,
  type EstimateBuilderState,
  type EstimateCategory,
} from "@/lib/estimates/types";
import {
  ALL_ESTIMATE_UNITS,
  getDefaultUnitForCategory,
  normalizeUnitForCategory,
} from "@/lib/estimates/units";

const VALID_CATEGORIES = new Set<EstimateCategory>(ESTIMATE_CATEGORIES);
const VALID_UNITS = new Set<string>(ALL_ESTIMATE_UNITS);

type RawRecommendationPayload = {
  summary?: string;
  explanation?: string;
  line_items?: Array<{
    category?: string;
    description?: string;
    quantity?: number;
    unit?: string;
    unit_cost?: number;
    reasoning?: string;
  }>;
  markup?: {
    overhead_percent?: number;
    contingency_percent?: number;
    profit_margin_percent?: number;
    overhead_reasoning?: string;
    contingency_reasoning?: string;
    profit_margin_reasoning?: string;
  };
};

function clampPercent(value: unknown, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
    return fallback;
  }

  return Math.round(parsed * 100) / 100;
}

function clampQuantity(value: unknown) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }

  return Math.round(parsed * 10000) / 10000;
}

function clampUnitCost(value: unknown) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }

  return Math.round(parsed * 100) / 100;
}

function normalizeLineItems(
  items: RawRecommendationPayload["line_items"]
): AiEstimateLineItemRecommendation[] {
  if (!items?.length) {
    return [];
  }

  return items
    .map((item) => {
      const category = VALID_CATEGORIES.has(item.category as EstimateCategory)
        ? (item.category as EstimateCategory)
        : null;

      const description = item.description?.trim();

      if (!category || !description) {
        return null;
      }

      const unit = normalizeUnitForCategory(
        category,
        item.unit && VALID_UNITS.has(item.unit) ? item.unit : undefined
      );

      return {
        category,
        description,
        quantity: clampQuantity(item.quantity),
        unit,
        unit_cost: clampUnitCost(item.unit_cost),
        reasoning: item.reasoning?.trim() || "Based on typical commercial electrical scope.",
      };
    })
    .filter((item): item is AiEstimateLineItemRecommendation => item !== null)
    .filter((item) => item.quantity > 0 || item.unit_cost > 0);
}

function normalizeMarkup(
  markup: RawRecommendationPayload["markup"],
  state: EstimateBuilderState
): AiEstimateMarkupRecommendation {
  return {
    overhead_percent: clampPercent(markup?.overhead_percent, state.overhead_percent),
    contingency_percent: clampPercent(
      markup?.contingency_percent,
      state.contingency_percent
    ),
    profit_margin_percent: clampPercent(
      markup?.profit_margin_percent,
      state.profit_margin_percent
    ),
    overhead_reasoning:
      markup?.overhead_reasoning?.trim() ||
      "Overhead covers supervision, project management, and general conditions.",
    contingency_reasoning:
      markup?.contingency_reasoning?.trim() ||
      "Contingency allowance for scope gaps and field conditions.",
    profit_margin_reasoning:
      markup?.profit_margin_reasoning?.trim() ||
      "Profit margin aligned with project risk and market conditions.",
  };
}

export function normalizeAiEstimateRecommendation(
  payload: RawRecommendationPayload | null,
  state: EstimateBuilderState,
  fallbackExplanation: string
): AiEstimateAssistantRecommendation {
  const lineItems = normalizeLineItems(payload?.line_items);
  const markup = normalizeMarkup(payload?.markup, state);

  return {
    summary:
      payload?.summary?.trim() ||
      (lineItems.length > 0
        ? `Suggested ${lineItems.length} line item(s) with updated markup assumptions.`
        : "Review markup recommendations for this scope."),
    explanation: payload?.explanation?.trim() || fallbackExplanation,
    line_items: lineItems,
    markup,
  };
}

export function buildEstimateContextSummary(
  state: EstimateBuilderState,
  context: AiEstimateAssistantContext
) {
  const totals = calculateEstimateTotals(
    state.line_items,
    state.overhead_percent,
    state.contingency_percent,
    state.profit_margin_percent,
    state.tax_percent
  );

  const lineItems = state.line_items
    .filter(
      (item) =>
        item.description.trim() || item.quantity > 0 || item.unit_cost > 0
    )
    .map(
      (item) =>
        `- [${item.category}] ${item.description || "(no description)"} | ${item.quantity} ${item.unit} @ $${item.unit_cost}`
    )
    .join("\n");

  return {
    totals,
    lineItems,
    projectBlock: `Project: ${context.projectName}
Customer: ${context.customerName}
Type: ${context.projectType ?? "Commercial electrical"}
Location: ${context.projectAddress ?? "Not specified"}`,
    estimateBlock: `Estimate title: ${state.title}
Overhead: ${state.overhead_percent}% | Contingency: ${state.contingency_percent}% | Profit: ${state.profit_margin_percent}% | Tax: ${state.tax_percent}%
Direct cost: $${totals.directCost.toFixed(0)} | Selling price: $${totals.finalSellingPrice.toFixed(0)} | Gross margin: ${totals.grossMarginPercent.toFixed(1)}%

Current line items:
${lineItems || "(none)"}

Notes: ${state.notes || "(none)"}`,
  };
}

export function buildEstimateExplanationPrompt(payload: AiEstimateAssistantPayload) {
  const { projectBlock, estimateBlock } = buildEstimateContextSummary(
    payload.state,
    payload.context
  );

  const history = payload.history
    .slice(-6)
    .map((message) => `${message.role.toUpperCase()}: ${message.content}`)
    .join("\n");

  return `You are VoltPilot AI, an expert commercial electrical estimator helping a contractor build an accurate bid.

${projectBlock}

${estimateBlock}

Conversation history:
${history || "(new conversation)"}

User request:
${payload.userMessage}

Write a clear, professional explanation of what you would include in this estimate. Cover:
- Labor hours and crew assumptions
- Key materials and quantities
- Equipment needs
- Subcontractor or miscellaneous costs if relevant
- Why recommended overhead, contingency, and profit margin percentages make sense for this project

Use short paragraphs and bullet points. Be specific to commercial electrical work (conduit, wire, panels, devices, testing, permits coordination, etc.). Do not output JSON.`;
}

export function buildEstimateStructuredPrompt(payload: AiEstimateAssistantPayload) {
  const { projectBlock, estimateBlock } = buildEstimateContextSummary(
    payload.state,
    payload.context
  );

  return `You are VoltPilot AI generating structured estimate recommendations for a commercial electrical contractor.

${projectBlock}

${estimateBlock}

User request:
${payload.userMessage}

Return JSON only with this exact shape:
{
  "summary": "One sentence summary of recommendations",
  "explanation": "Brief recap of the estimate approach",
  "line_items": [
    {
      "category": "labor|materials|equipment|subcontractors|miscellaneous",
      "description": "Line item description",
      "quantity": 0,
      "unit": "hrs|ea|days|lf|sf|cy|lot|wk|mo",
      "unit_cost": 0,
      "reasoning": "Why this item and quantity"
    }
  ],
  "markup": {
    "overhead_percent": 0,
    "contingency_percent": 0,
    "profit_margin_percent": 0,
    "overhead_reasoning": "Why this overhead %",
    "contingency_reasoning": "Why this contingency %",
    "profit_margin_reasoning": "Why this profit margin %"
  }
}

Rules:
- Suggest realistic commercial electrical quantities and unit costs for the US market.
- Include labor in hours where appropriate.
- Do not duplicate existing line items unless the user asks to refine them.
- Provide 4-12 high-value line items when building from a new scope description.
- Percentages must be between 0 and 100.
- Every line item must include reasoning.
- If the user is asking a follow-up question, adjust recommendations accordingly.`;
}

function buildRulesEstimateExplanation(payload: AiEstimateAssistantPayload) {
  const { totals, lineItems, projectBlock } = buildEstimateContextSummary(
    payload.state,
    payload.context
  );
  const activeCount = payload.state.line_items.filter(
    (item) =>
      item.description.trim() || item.quantity > 0 || item.unit_cost > 0
  ).length;

  return [
    projectBlock,
    "",
    `You asked: ${payload.userMessage}`,
    "",
    `This estimate has ${activeCount} active line item(s), a direct cost of $${totals.directCost.toFixed(0)}, and a selling price of $${totals.finalSellingPrice.toFixed(0)} (${totals.grossMarginPercent.toFixed(1)}% gross margin).`,
    "",
    "Rules-based guidance (OpenAI unavailable):",
    "- Confirm labor covers rough-in, trim, testing, and closeout for the described scope.",
    "- Match material allowances to conduit, wire, devices, panels, and equipment references.",
    "- Validate overhead, contingency, and profit against project risk and schedule.",
    "- Document assumptions for access, working hours, permits, and owner-furnished equipment.",
    "",
    lineItems ? `Current line items:\n${lineItems}` : "No line items entered yet.",
  ].join("\n");
}

function mapReviewCategoryToEstimateCategory(
  category: string
): EstimateCategory | null {
  switch (category) {
    case "missing_materials":
    case "suggested_items":
      return "materials";
    case "missing_labor":
    case "unusual_labor":
      return "labor";
    case "duplicate_items":
    case "inconsistent_pricing":
    case "estimating_risks":
    case "pre_proposal":
      return "miscellaneous";
    case "low_margin":
      return null;
    default:
      return null;
  }
}

function buildRulesEstimateRecommendations(
  payload: AiEstimateAssistantPayload,
  fallbackExplanation: string
): AiEstimateAssistantRecommendation {
  const review = reviewEstimate(payload.state);
  const lineItems: AiEstimateLineItemRecommendation[] = [];

  for (const suggestion of review.suggestions) {
    const category = mapReviewCategoryToEstimateCategory(suggestion.category);

    if (!category) {
      continue;
    }

    lineItems.push({
      category,
      description: suggestion.title.replace(/^Missing /i, "").trim(),
      quantity: category === "labor" ? 8 : 1,
      unit: getDefaultUnitForCategory(category),
      unit_cost: 0,
      reasoning: suggestion.description,
    });
  }

  const markupAdjustments =
    review.suggestions.some((item) => item.category === "low_margin") ?
      {
        profit_margin_percent: Math.min(
          100,
          payload.state.profit_margin_percent + 3
        ),
        profit_margin_reasoning:
          "Rules review flagged a lean margin for this scope profile.",
      }
    : {};

  return normalizeAiEstimateRecommendation(
    {
      summary: review.summary,
      explanation: fallbackExplanation,
      line_items: lineItems.slice(0, 10),
      markup: markupAdjustments,
    },
    payload.state,
    fallbackExplanation
  );
}

export async function streamEstimateExplanation(
  payload: AiEstimateAssistantPayload,
  onDelta: (text: string) => void
) {
  const { isConfigured } = getOpenAIConfig();

  if (!isConfigured) {
    const explanation = buildRulesEstimateExplanation(payload);
    onDelta(explanation);
    return explanation;
  }

  const client = getOpenAIClient();

  if (!client) {
    const explanation = buildRulesEstimateExplanation(payload);
    onDelta(explanation);
    return explanation;
  }

  const { model } = getOpenAIConfig();

  try {
    const stream = await client.chat.completions.create({
      model,
      temperature: 0.35,
      stream: true,
      messages: [
        {
          role: "system",
          content:
            "You are VoltPilot AI, a commercial electrical estimating assistant. Provide practical, defensible estimating guidance.",
        },
        {
          role: "user",
          content: buildEstimateExplanationPrompt(payload),
        },
      ],
    });

    let fullText = "";

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content ?? "";
      if (!delta) {
        continue;
      }

      fullText += delta;
      onDelta(delta);
    }

    return fullText.trim();
  } catch {
    const explanation = buildRulesEstimateExplanation(payload);
    onDelta(explanation);
    return explanation;
  }
}

export async function generateEstimateRecommendations(
  payload: AiEstimateAssistantPayload,
  fallbackExplanation: string
): Promise<AiEstimateAssistantRecommendation> {
  const { isConfigured } = getOpenAIConfig();

  if (!isConfigured) {
    return buildRulesEstimateRecommendations(payload, fallbackExplanation);
  }

  const client = getOpenAIClient();

  if (!client) {
    return buildRulesEstimateRecommendations(payload, fallbackExplanation);
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
            "You are VoltPilot AI. Return only valid JSON for commercial electrical estimate recommendations.",
        },
        {
          role: "user",
          content: buildEstimateStructuredPrompt(payload),
        },
      ],
    });

    const content = completion.choices[0]?.message?.content ?? "";
    const parsed = parseJsonResponse<RawRecommendationPayload>(content);

    return normalizeAiEstimateRecommendation(
      parsed,
      payload.state,
      fallbackExplanation
    );
  } catch {
    return buildRulesEstimateRecommendations(payload, fallbackExplanation);
  }
}

export async function runEstimateAssistant(
  payload: AiEstimateAssistantPayload,
  onExplanationDelta?: (text: string) => void
): Promise<AiEstimateAssistantRecommendation> {
  const explanation = await streamEstimateExplanation(payload, (delta) => {
    onExplanationDelta?.(delta);
  });

  const recommendations = await generateEstimateRecommendations(
    payload,
    explanation
  );

  return {
    ...recommendations,
    explanation: recommendations.explanation || explanation,
  };
}
