import "server-only";

import type { DailyBriefing } from "@/lib/ai/daily-briefing";
import { formatPercent } from "@/lib/analytics/format";
import { daysBetween, safePercent } from "@/lib/analytics/time-buckets";
import { parseNumber } from "@/lib/projects/format";
import { createClient } from "@/lib/supabase/server";

export type CopilotSuggestionPriority = "high" | "medium";

export type CopilotSuggestion = {
  id: string;
  message: string;
  href: string;
  ctaLabel: string;
  priority: CopilotSuggestionPriority;
};

export type CopilotSuggestionsResult = {
  suggestions: CopilotSuggestion[];
  generatedAt: string;
};

function normalizeCustomer(
  customer: { company_name: string } | { company_name: string }[] | null | undefined
) {
  if (Array.isArray(customer)) {
    return customer[0]?.company_name ?? "Customer";
  }

  return customer?.company_name ?? "Customer";
}

function includesAny(text: string, terms: string[]) {
  const normalized = text.toLowerCase();
  return terms.some((term) => normalized.includes(term));
}

export async function getProactiveCopilotSuggestions(
  organizationId: string
): Promise<CopilotSuggestionsResult> {
  const supabase = await createClient();
  const nowIso = new Date().toISOString();

  const [proposalsResult, projectsResult, estimatesResult] = await Promise.all([
    supabase
      .from("proposals")
      .select(
        `
          id,
          title,
          status,
          amount,
          sent_at,
          accepted_at,
          declined_at,
          updated_at,
          project:projects!inner (
            id,
            project_name,
            customer:customers!inner ( company_name )
          )
        `
      )
      .eq("organization_id", organizationId)
      .order("updated_at", { ascending: false })
      .limit(100),
    supabase
      .from("projects")
      .select("id, project_name, status, estimated_value, updated_at")
      .eq("organization_id", organizationId)
      .is("archived_at", null)
      .neq("status", "Archived")
      .order("updated_at", { ascending: false })
      .limit(80),
    supabase
      .from("estimates")
      .select(
        `
          id,
          title,
          status,
          selling_price,
          grand_total,
          profit_amount,
          direct_cost_total,
          profit_margin_percent,
          gross_margin_percent,
          updated_at,
          project:projects!inner (
            id,
            project_name,
            estimated_value,
            status
          ),
          line_items:estimate_line_items (
            category,
            description,
            quantity,
            unit_cost
          )
        `
      )
      .eq("organization_id", organizationId)
      .order("updated_at", { ascending: false })
      .limit(100),
  ]);

  if (proposalsResult.error) {
    throw new Error(proposalsResult.error.message);
  }
  if (projectsResult.error) {
    throw new Error(projectsResult.error.message);
  }
  if (estimatesResult.error) {
    throw new Error(estimatesResult.error.message);
  }

  const proposals = proposalsResult.data ?? [];
  const projects = projectsResult.data ?? [];
  const estimates = estimatesResult.data ?? [];
  const suggestions: CopilotSuggestion[] = [];

  const followUpProposal = proposals
    .filter((proposal) => proposal.status === "Sent" || proposal.status === "Viewed")
    .map((proposal) => {
      const project = Array.isArray(proposal.project) ? proposal.project[0] : proposal.project;
      const sentAt = proposal.sent_at ?? proposal.updated_at;
      return {
        proposal,
        project,
        customerName: normalizeCustomer(project?.customer),
        daysSinceSent: daysBetween(sentAt, nowIso),
      };
    })
    .sort((a, b) => b.daysSinceSent - a.daysSinceSent)[0];

  if (followUpProposal && followUpProposal.daysSinceSent >= 1) {
    suggestions.push({
      id: `follow-up-${followUpProposal.proposal.id}`,
      message: `You should follow up with ${followUpProposal.customerName} today.`,
      href: `/proposals/${followUpProposal.proposal.id}`,
      ctaLabel: "Open Proposal →",
      priority: followUpProposal.daysSinceSent >= 7 ? "high" : "medium",
    });
  }

  for (const project of projects.filter((item) => ["Awarded", "Active"].includes(item.status))) {
    const projectEstimates = estimates.filter((estimate) => {
      const linkedProject = Array.isArray(estimate.project)
        ? estimate.project[0]
        : estimate.project;
      return linkedProject?.id === project.id;
    });

    const latestEstimate = projectEstimates[0];
    const budget = parseNumber(project.estimated_value);
    const estimateTotal = parseNumber(
      latestEstimate?.selling_price ?? latestEstimate?.grand_total
    );

    if (budget > 0 && estimateTotal > budget * 1.05) {
      suggestions.push({
        id: `over-budget-${project.id}`,
        message: `${project.project_name} is trending over budget.`,
        href: `/projects/${project.id}`,
        ctaLabel: "Open Project →",
        priority: "high",
      });
      break;
    }
  }

  const acceptedByScope = new Map<string, number>();
  const sentByScope = new Map<string, number>();

  for (const proposal of proposals) {
    const title = proposal.title.toLowerCase();
    let scope = "general";

    if (includesAny(title, ["panel", "switchgear", "distribution"])) {
      scope = "panel";
    } else if (includesAny(title, ["ev charger", "ev ", "vehicle"])) {
      scope = "ev";
    } else if (includesAny(title, ["tenant", "ti ", "build-out"])) {
      scope = "tenant_improvement";
    } else if (includesAny(title, ["light", "fixture", "led"])) {
      scope = "lighting";
    }

    sentByScope.set(scope, (sentByScope.get(scope) ?? 0) + 1);

    if (proposal.status === "Accepted") {
      acceptedByScope.set(scope, (acceptedByScope.get(scope) ?? 0) + 1);
    }
  }

  const closeRates = Array.from(sentByScope.entries())
    .map(([scope, sentCount]) => ({
      scope,
      sentCount,
      closeRate: safePercent(acceptedByScope.get(scope) ?? 0, sentCount),
    }))
    .filter((item) => item.sentCount >= 2)
    .sort((a, b) => b.closeRate - a.closeRate);

  const topScope = closeRates[0];
  if (topScope && topScope.closeRate >= 25) {
    const label =
      topScope.scope === "panel"
        ? "Panel replacement estimates"
        : topScope.scope === "ev"
          ? "EV charger estimates"
          : topScope.scope === "tenant_improvement"
            ? "Tenant improvement estimates"
            : topScope.scope === "lighting"
              ? "Lighting estimates"
              : "Similar estimates";

    suggestions.push({
      id: `close-rate-${topScope.scope}`,
      message: `${label} have the highest close rate (${topScope.closeRate.toFixed(0)}%).`,
      href: "/proposals",
      ctaLabel: "View Proposals →",
      priority: "medium",
    });
  }

  const margins = estimates
    .map((estimate) =>
      parseNumber(estimate.profit_margin_percent ?? estimate.gross_margin_percent)
    )
    .filter((value) => value > 0);

  const averageMargin =
    margins.length > 0
      ? margins.reduce((sum, value) => sum + value, 0) / margins.length
      : 0;

  const lowMarginEstimate = estimates.find((estimate) => {
    const margin = parseNumber(
      estimate.profit_margin_percent ?? estimate.gross_margin_percent
    );
    return margin > 0 && averageMargin > 0 && margin < averageMargin - 3;
  });

  if (lowMarginEstimate && averageMargin > 0) {
    suggestions.push({
      id: `markup-${lowMarginEstimate.id}`,
      message: `Your labor markup is below your average (${formatPercent(averageMargin)} portfolio target).`,
      href: `/estimates/${lowMarginEstimate.id}`,
      ctaLabel: "Review Estimate →",
      priority: "high",
    });
  }

  const draftEstimate = estimates.find((estimate) => estimate.title && estimate.status === "Draft");
  if (draftEstimate && suggestions.length < 5) {
    const project = Array.isArray(draftEstimate.project)
      ? draftEstimate.project[0]
      : draftEstimate.project;

    suggestions.push({
      id: `finish-estimate-${draftEstimate.id}`,
      message: `Finish "${draftEstimate.title}" for ${project?.project_name ?? "an open project"}.`,
      href: `/estimates/${draftEstimate.id}`,
      ctaLabel: "Open Estimate →",
      priority: "medium",
    });
  }

  return {
    suggestions: suggestions.slice(0, 5),
    generatedAt: nowIso,
  };
}

export function mergeBriefingWithCopilot(
  briefing: DailyBriefing,
  copilot: CopilotSuggestionsResult
) {
  return {
    briefing,
    copilot,
  };
}
