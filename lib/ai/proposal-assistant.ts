import { getOpenAIClient } from "@/lib/ai/client";
import { getOpenAIConfig } from "@/lib/ai/env";
import type {
  AiProposalAssistantPayload,
  ProposalAssistantResult,
  ProposalAssistantTask,
} from "@/lib/ai/types";
import type { ProposalEditorState } from "@/lib/proposals/types";

const TASK_CONFIG: Record<
  ProposalAssistantTask,
  { field: keyof ProposalEditorState; label: string; instruction: string }
> = {
  scope_of_work: {
    field: "scope_of_work",
    label: "Scope of work",
    instruction:
      "Write a professional scope of work section for a commercial electrical proposal. Use clear paragraphs or bullet points. Cover major installation, testing, and closeout activities based on the estimate.",
  },
  rewrite_professional: {
    field: "scope_of_work",
    label: "Professional rewrite",
    instruction:
      "Rewrite the scope of work to sound more professional and client-ready. Preserve technical accuracy. Improve tone without adding scope not supported by the estimate.",
  },
  improve_clarity: {
    field: "scope_of_work",
    label: "Clarity improvement",
    instruction:
      "Improve clarity and formatting of the proposal content. Use concise language, logical grouping, and professional structure.",
  },
  project_summary: {
    field: "notes",
    label: "Project summary",
    instruction:
      "Write a brief executive project summary suitable for the proposal cover section or notes. Highlight scope, value, and schedule readiness.",
  },
  exclusions: {
    field: "exclusions",
    label: "Exclusions",
    instruction:
      "Generate standard commercial electrical exclusions appropriate for this scope. Include common items like permits by others, utility fees, asbestos abatement, and work by other trades unless clearly in scope.",
  },
  assumptions: {
    field: "assumptions",
    label: "Assumptions",
    instruction:
      "Generate key assumptions for this electrical bid: working hours, access, existing conditions, code compliance, and owner-furnished items.",
  },
};

function buildProposalPrompt(payload: AiProposalAssistantPayload) {
  const config = TASK_CONFIG[payload.task];
  const { currentState, context } = payload;

  const lineItemSummary = context.estimateSnapshot
    ? Object.entries(context.estimateSnapshot.line_items_by_category)
        .flatMap(([category, items]) =>
          items.slice(0, 6).map(
            (item) =>
              `- [${category}] ${item.description} (${item.quantity} ${item.unit})`
          )
        )
        .join("\n")
    : "(no estimate snapshot)";

  return `${config.instruction}

Project: ${context.projectName}
Customer: ${context.customerName}
Contractor: ${context.companyName}
Proposal amount: $${context.estimateSnapshot?.selling_price?.toFixed(0) ?? "N/A"}
Gross margin: ${context.estimateSnapshot?.gross_margin_percent?.toFixed(1) ?? "N/A"}%

Current proposal title: ${currentState.title}
Current scope of work:
${currentState.scope_of_work || "(empty)"}

Current labor summary:
${currentState.labor_summary || "(empty)"}

Current materials summary:
${currentState.materials_summary || "(empty)"}

Current exclusions:
${currentState.exclusions || "(empty)"}

Current notes:
${currentState.notes || "(empty)"}

Estimate line items (sample):
${lineItemSummary}

Return only the generated text for the requested section. No markdown fences. Do not modify the estimate pricing.`;
}

function fallbackProposalContent(payload: AiProposalAssistantPayload): string {
  const { currentState, context, task } = payload;
  const config = TASK_CONFIG[task];

  if (task === "exclusions") {
    return [
      "Permits and fees unless specifically included.",
      "Utility company charges, transformer rentals, and service upgrades by the utility.",
      "Work by other trades including structural supports, patching, and painting.",
      "Asbestos or hazardous material abatement.",
      "After-hours work unless noted in scope.",
      "Owner-furnished equipment installation beyond connection and testing.",
    ].join("\n");
  }

  if (task === "assumptions") {
    return [
      `Normal working hours, Monday through Friday.`,
      `Clear access to work areas and staging as required.`,
      `Existing conditions are as observed during site review.`,
      `Work conforms to applicable NEC and local amendments.`,
      `Owner will provide timely approvals and utility coordination.`,
    ].join("\n");
  }

  if (task === "project_summary") {
    return `${context.companyName} proposes to provide electrical scope for ${context.projectName} at ${context.customerName}. This proposal reflects the estimated installation, testing, and closeout activities described in the scope of work.`;
  }

  const currentValue = currentState[config.field];
  const currentText =
    typeof currentValue === "string" ? currentValue.trim() : "";

  if (currentText) {
    return currentText;
  }

  return `Scope of work for ${context.projectName} based on the linked estimate. Review line items and refine this section before sending.`;
}

export async function runProposalAssistant(
  payload: AiProposalAssistantPayload
): Promise<ProposalAssistantResult> {
  const config = TASK_CONFIG[payload.task];
  const { isConfigured } = getOpenAIConfig();

  if (!isConfigured) {
    return {
      field: config.field,
      label: config.label,
      content: fallbackProposalContent(payload),
      source: "rules",
      aiEnabled: false,
    };
  }

  const client = getOpenAIClient();

  if (!client) {
    return {
      field: config.field,
      label: config.label,
      content: fallbackProposalContent(payload),
      source: "rules",
      aiEnabled: false,
    };
  }

  try {
    const { model } = getOpenAIConfig();
    const completion = await client.chat.completions.create({
      model,
      temperature: 0.4,
      messages: [
        {
          role: "system",
          content:
            "You are VoltPilot AI, a professional proposal writer for commercial electrical contractors. Write clear, client-ready proposal language. Recommendations only — never change pricing.",
        },
        {
          role: "user",
          content: buildProposalPrompt(payload),
        },
      ],
    });

    const content = completion.choices[0]?.message?.content?.trim();

    return {
      field: config.field,
      label: config.label,
      content: content || fallbackProposalContent(payload),
      source: "openai",
      aiEnabled: true,
    };
  } catch {
    return {
      field: config.field,
      label: config.label,
      content: fallbackProposalContent(payload),
      source: "rules",
      aiEnabled: true,
    };
  }
}

export { TASK_CONFIG as PROPOSAL_ASSISTANT_TASKS };
