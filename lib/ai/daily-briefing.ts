import "server-only";

import { formatCurrency, formatPercent } from "@/lib/analytics/format";
import { daysBetween, safePercent } from "@/lib/analytics/time-buckets";
import { parseNumber } from "@/lib/projects/format";
import { createClient } from "@/lib/supabase/server";

export type DailyBriefingBullet = {
  id: string;
  message: string;
};

export type DailyBriefing = {
  headline: string;
  bullets: DailyBriefingBullet[];
  estimatedMonthlyProfit: string | null;
  generatedAt: string;
  isEmpty: boolean;
};

function startOfMonth(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function startOfPriorMonth(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth() - 1, 1);
}

function endOfPriorMonth(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 0, 23, 59, 59, 999);
}

function normalizeCustomer(
  customer: { company_name: string } | { company_name: string }[] | null | undefined
) {
  if (Array.isArray(customer)) {
    return customer[0]?.company_name ?? "Customer";
  }

  return customer?.company_name ?? "Customer";
}

export async function getDailyBriefing(
  organizationId: string
): Promise<DailyBriefing> {
  const supabase = await createClient();
  const now = new Date();
  const nowIso = now.toISOString();
  const monthStart = startOfMonth(now);
  const priorMonthStart = startOfPriorMonth(now);
  const priorMonthEnd = endOfPriorMonth(now);

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
      .limit(80),
    supabase
      .from("projects")
      .select(
        `
          id,
          project_name,
          status,
          estimated_value,
          updated_at,
          customer:customers!inner ( company_name )
        `
      )
      .eq("organization_id", organizationId)
      .is("archived_at", null)
      .neq("status", "Archived")
      .order("updated_at", { ascending: false })
      .limit(60),
    supabase
      .from("estimates")
      .select(
        `
          id,
          selling_price,
          grand_total,
          profit_amount,
          direct_cost_total,
          status,
          updated_at,
          project:projects!inner (
            id,
            project_name,
            status,
            estimated_value
          )
        `
      )
      .eq("organization_id", organizationId)
      .order("updated_at", { ascending: false })
      .limit(80),
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

  const isEmpty =
    proposals.length === 0 && projects.length === 0 && estimates.length === 0;

  if (isEmpty) {
    return {
      headline: "Your daily briefing will appear here as you add projects and estimates.",
      bullets: [
        {
          id: "empty-start",
          message: "Create your first estimate to unlock revenue, pipeline, and follow-up insights.",
        },
      ],
      estimatedMonthlyProfit: null,
      generatedAt: nowIso,
      isEmpty: true,
    };
  }

  const bullets: DailyBriefingBullet[] = [];

  const followUpProposals = proposals.filter((proposal) => {
    if (!["Sent", "Viewed"].includes(proposal.status) || !proposal.sent_at) {
      return false;
    }

    return daysBetween(proposal.sent_at, nowIso) >= 3;
  });

  if (followUpProposals.length > 0) {
    bullets.push({
      id: "proposal-follow-up",
      message: `${followUpProposals.length} proposal${followUpProposals.length === 1 ? "" : "s"} need follow-up.`,
    });
  }

  const currentMonthRevenue = proposals
    .filter(
      (proposal) =>
        proposal.accepted_at &&
        new Date(proposal.accepted_at) >= monthStart
    )
    .reduce((sum, proposal) => sum + parseNumber(proposal.amount), 0);

  const priorMonthRevenue = proposals
    .filter(
      (proposal) =>
        proposal.accepted_at &&
        new Date(proposal.accepted_at) >= priorMonthStart &&
        new Date(proposal.accepted_at) <= priorMonthEnd
    )
    .reduce((sum, proposal) => sum + parseNumber(proposal.amount), 0);

  if (currentMonthRevenue > 0 && priorMonthRevenue > 0) {
    const changePercent = safePercent(
      currentMonthRevenue - priorMonthRevenue,
      priorMonthRevenue
    );
    const direction = changePercent >= 0 ? "up" : "down";
    bullets.push({
      id: "revenue-trend",
      message: `Revenue is ${direction} ${Math.abs(changePercent).toFixed(0)}% this month.`,
    });
  } else if (currentMonthRevenue > 0) {
    bullets.push({
      id: "revenue-started",
      message: `Revenue this month is ${formatCurrency(currentMonthRevenue)} so far.`,
    });
  }

  const activeProjects = projects.filter((project) =>
    ["Awarded", "Active"].includes(project.status)
  );

  for (const project of activeProjects.slice(0, 8)) {
    const projectEstimates = estimates.filter((estimate) => {
      const linkedProject = Array.isArray(estimate.project)
        ? estimate.project[0]
        : estimate.project;
      return linkedProject?.id === project.id;
    });

    const latestEstimate = projectEstimates[0];
    if (!latestEstimate) {
      continue;
    }

    const estimateTotal = parseNumber(
      latestEstimate.selling_price ?? latestEstimate.grand_total
    );
    const projectBudget = parseNumber(project.estimated_value);

    if (projectBudget > 0 && estimateTotal > 0 && estimateTotal <= projectBudget * 0.95) {
      bullets.push({
        id: `under-budget-${project.id}`,
        message: `${project.project_name} is under budget.`,
      });
      break;
    }
  }

  const staleCustomers = new Map<string, number>();

  for (const proposal of proposals) {
    if (!["Sent", "Viewed"].includes(proposal.status) || !proposal.sent_at) {
      continue;
    }

    const daysSinceSent = daysBetween(proposal.sent_at, nowIso);
    if (daysSinceSent < 10) {
      continue;
    }

    const project = Array.isArray(proposal.project) ? proposal.project[0] : proposal.project;
    const customerName = normalizeCustomer(project?.customer);
    staleCustomers.set(customerName, Math.max(staleCustomers.get(customerName) ?? 0, daysSinceSent));
  }

  if (staleCustomers.size > 0) {
    bullets.push({
      id: "stale-customers",
      message: `${staleCustomers.size} customer${staleCustomers.size === 1 ? "" : "s"} haven't responded in 10 days.`,
    });
  }

  const monthlyProfit = estimates
    .filter((estimate) => new Date(estimate.updated_at) >= monthStart)
    .reduce((sum, estimate) => {
      const profit = parseNumber(estimate.profit_amount);
      if (profit > 0) {
        return sum + profit;
      }

      const revenue = parseNumber(estimate.selling_price ?? estimate.grand_total);
      const directCost = parseNumber(estimate.direct_cost_total);
      return sum + Math.max(0, revenue - directCost);
    }, 0);

  const estimatingCount = projects.filter(
    (project) => project.status === "Estimating"
  ).length;

  if (estimatingCount > 0 && bullets.length < 5) {
    bullets.push({
      id: "estimating-pipeline",
      message: `${estimatingCount} project${estimatingCount === 1 ? "" : "s"} in estimating.`,
    });
  }

  const acceptedCount = proposals.filter((proposal) => proposal.status === "Accepted").length;
  const decidedCount =
    acceptedCount +
    proposals.filter((proposal) => proposal.status === "Declined").length;

  if (decidedCount > 0 && bullets.length < 5) {
    bullets.push({
      id: "win-rate",
      message: `Win rate is ${formatPercent(safePercent(acceptedCount, decidedCount))} on decided proposals.`,
    });
  }

  if (bullets.length === 0) {
    bullets.push({
      id: "steady-state",
      message: "Pipeline looks steady — no urgent follow-ups flagged this morning.",
    });
  }

  return {
    headline: "Here's your business summary:",
    bullets: bullets.slice(0, 5),
    estimatedMonthlyProfit:
      monthlyProfit > 0 ? formatCurrency(monthlyProfit) : null,
    generatedAt: nowIso,
    isEmpty: false,
  };
}
