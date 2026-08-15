import { daysUntil } from "@/lib/projects/profile-types";
import { parseNumber } from "@/lib/projects/format";

export type DashboardActionItem = {
  id: string;
  label: string;
  context: string;
  ctaLabel: string;
  href: string;
  urgency: number;
  isRisk: boolean;
};

export type DashboardContinueItem = {
  id: string;
  label: string;
  href: string;
};

type BriefingProject = {
  id: string;
  project_name: string;
  status: string;
  bid_due_date: string | null;
  updated_at: string;
  customerName: string;
};

type BriefingEstimate = {
  id: string;
  title: string;
  status: string;
  updated_at: string;
  direct_cost_total: number | null;
  customerName: string;
  project: {
    id: string;
    project_name: string;
    status: string;
    bid_due_date?: string | null;
  } | null;
};

type BriefingProposal = {
  id: string;
  title: string;
  status: string;
  sent_at: string | null;
  updated_at: string;
  project: {
    id: string;
    project_name: string;
  } | null;
  customerName: string;
};

type JobActualsRow = {
  project_id: string;
  actual_total: number | null;
};

type BuildBriefingInput = {
  isPortfolioEmpty: boolean;
  customerCount: number;
  projects: BriefingProject[];
  estimates: BriefingEstimate[];
  proposals: BriefingProposal[];
  jobActuals: JobActualsRow[];
};

const MAX_PRIORITIES = 5;
const MAX_CONTINUE = 4;

function daysSince(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
}

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function normalizeProject<T extends { id: string; project_name: string }>(
  project: T | T[] | null | undefined
) {
  if (Array.isArray(project)) {
    return project[0] ?? null;
  }

  return project ?? null;
}

function primaryEstimateDirectCost(
  projectId: string,
  estimates: BriefingEstimate[]
) {
  const projectEstimates = estimates.filter((estimate) => {
    const project = normalizeProject(estimate.project);
    return project?.id === projectId;
  });

  const finalEstimate = projectEstimates.find((estimate) => estimate.status === "Final");
  const source = finalEstimate ?? projectEstimates[0];
  return source ? parseNumber(source.direct_cost_total) : 0;
}

function buildPriorityCandidates(input: BuildBriefingInput): DashboardActionItem[] {
  const items: DashboardActionItem[] = [];
  const todayStart = startOfToday();

  if (input.isPortfolioEmpty || input.customerCount === 0) {
    return [
      {
        id: "onboard-customer",
        label: "Add your first customer",
        context: "Start building your pipeline",
        ctaLabel: "Add customer",
        href: "/customers?action=add",
        urgency: 100,
        isRisk: false,
      },
    ];
  }

  const actualsByProject = new Map(
    input.jobActuals.map((row) => [row.project_id, parseNumber(row.actual_total)])
  );

  for (const project of input.projects) {
    if (!["Awarded", "Active"].includes(project.status)) {
      continue;
    }

    const estimatedCost = primaryEstimateDirectCost(project.id, input.estimates);
    const actualTotal = actualsByProject.get(project.id) ?? 0;

    if (estimatedCost <= 0 || actualTotal <= 0) {
      continue;
    }

    const usedPercent = (actualTotal / estimatedCost) * 100;

    if (usedPercent > 100) {
      items.push({
        id: `budget-${project.id}`,
        label: "Budget overrun requires attention",
        context: `${project.project_name} · ${usedPercent.toFixed(0)}% of estimate spent`,
        ctaLabel: "Review job costing",
        href: `/projects/${project.id}#job-costing`,
        urgency: 110,
        isRisk: true,
      });
    } else if (usedPercent > 85) {
      items.push({
        id: `budget-tight-${project.id}`,
        label: "Budget is tightening",
        context: `${project.project_name} · ${usedPercent.toFixed(0)}% of estimate used`,
        ctaLabel: "Review job costing",
        href: `/projects/${project.id}#job-costing`,
        urgency: 95,
        isRisk: true,
      });
    }
  }

  for (const project of input.projects) {
    if (!["Lead", "Estimating", "Proposal Sent"].includes(project.status)) {
      continue;
    }

    const remaining = daysUntil(project.bid_due_date);
    if (remaining === null) {
      continue;
    }

    if (remaining < 0) {
      items.push({
        id: `bid-overdue-${project.id}`,
        label: "Overdue bid deadline",
        context: `${project.project_name} · ${Math.abs(remaining)} day${Math.abs(remaining) === 1 ? "" : "s"} overdue`,
        ctaLabel: "Open project",
        href: `/projects/${project.id}`,
        urgency: 105,
        isRisk: true,
      });
    } else if (remaining === 0 && project.status === "Estimating") {
      items.push({
        id: `bid-today-${project.id}`,
        label: "Bid due today",
        context: `${project.project_name} · finalize estimate and proposal`,
        ctaLabel: "Continue estimate",
        href: `/projects/${project.id}`,
        urgency: 90,
        isRisk: true,
      });
    }
  }

  for (const proposal of input.proposals) {
    if (!["Sent", "Viewed"].includes(proposal.status)) {
      continue;
    }

    const project = normalizeProject(proposal.project);
    const sentDays = proposal.sent_at ? daysSince(proposal.sent_at) : null;

    if (proposal.status === "Viewed") {
      items.push({
        id: `viewed-${proposal.id}`,
        label: "Customer waiting on a response",
        context: `${proposal.customerName} viewed ${proposal.title}`,
        ctaLabel: "Follow up",
        href: `/proposals/${proposal.id}`,
        urgency: sentDays !== null && sentDays >= 3 ? 88 : 82,
        isRisk: sentDays !== null && sentDays >= 2,
      });
      continue;
    }

    if (sentDays !== null && sentDays >= 3) {
      items.push({
        id: `followup-${proposal.id}`,
        label: "Proposal waiting for follow-up",
        context: `${proposal.title} · sent ${sentDays} days ago`,
        ctaLabel: "Follow up",
        href: `/proposals/${proposal.id}`,
        urgency: 85 + Math.min(sentDays, 10),
        isRisk: true,
      });
      continue;
    }

    items.push({
      id: `pending-${proposal.id}`,
      label: "Proposal awaiting approval",
      context: `${proposal.customerName} · ${project?.project_name ?? proposal.title}`,
      ctaLabel: "Check status",
      href: `/proposals/${proposal.id}`,
      urgency: 75,
      isRisk: false,
    });
  }

  for (const project of input.projects) {
    if (project.status !== "Awarded" && project.status !== "Active") {
      continue;
    }

    const updatedToday = new Date(project.updated_at) >= todayStart;

    if (project.status === "Awarded" && updatedToday) {
      items.push({
        id: `start-${project.id}`,
        label: "Job starting today",
        context: `${project.project_name} · ${project.customerName}`,
        ctaLabel: "Start job costing",
        href: `/projects/${project.id}#job-costing`,
        urgency: 80,
        isRisk: false,
      });
    } else if (project.status === "Awarded") {
      items.push({
        id: `mobilize-${project.id}`,
        label: "Job ready to mobilize",
        context: `${project.project_name} · awarded and waiting to start`,
        ctaLabel: "Open project",
        href: `/projects/${project.id}`,
        urgency: 70,
        isRisk: false,
      });
    }
  }

  for (const estimate of input.estimates) {
    if (estimate.status !== "Draft") {
      continue;
    }

    const project = normalizeProject(estimate.project);
    const remaining = project?.bid_due_date ? daysUntil(project.bid_due_date) : null;

    if (remaining !== null && remaining <= 2 && project?.status === "Estimating") {
      items.push({
        id: `estimate-due-${estimate.id}`,
        label: "Overdue estimate",
        context: `${estimate.title} · bid due ${remaining <= 0 ? "now" : `in ${remaining} day${remaining === 1 ? "" : "s"}`}`,
        ctaLabel: "Continue estimate",
        href: `/estimates/${estimate.id}`,
        urgency: remaining <= 0 ? 92 : 78,
        isRisk: remaining <= 0,
      });
    }
  }

  return items;
}

function estimateEntityName(estimate: BriefingEstimate) {
  const project = normalizeProject(estimate.project);
  return project?.project_name ?? estimate.title;
}

function buildContinueOnboarding(input: BuildBriefingInput): DashboardContinueItem[] {
  if (input.customerCount === 0) {
    return [
      {
        id: "onboard-customer",
        label: "Create your first customer",
        href: "/customers?action=add",
      },
    ];
  }

  const activeProjects = input.projects.filter(
    (project) => !["Lost", "Archived"].includes(project.status)
  );

  if (activeProjects.length === 0) {
    return [
      {
        id: "onboard-project",
        label: "Create your first project",
        href: "/projects/new",
      },
    ];
  }

  if (input.estimates.length === 0) {
    return [
      {
        id: "onboard-estimate",
        label: "Start your first estimate",
        href: "/estimates",
      },
    ];
  }

  return [
    {
      id: "onboard-new-estimate",
      label: "Start a new estimate",
      href: "/projects?status=Estimating",
    },
  ];
}

function buildContinueCandidates(input: BuildBriefingInput): DashboardContinueItem[] {
  const items: DashboardContinueItem[] = [];

  const draftEstimate = [...input.estimates]
    .filter((estimate) => estimate.status === "Draft")
    .sort(
      (left, right) =>
        new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime()
    )[0];

  if (draftEstimate) {
    items.push({
      id: `continue-estimate-${draftEstimate.id}`,
      label: `Continue ${estimateEntityName(draftEstimate)} estimate`,
      href: `/estimates/${draftEstimate.id}`,
    });
  }

  const followUpProposal = [...input.proposals]
    .filter((proposal) => ["Sent", "Viewed"].includes(proposal.status))
    .sort((left, right) => {
      const leftSent = left.sent_at ? new Date(left.sent_at).getTime() : 0;
      const rightSent = right.sent_at ? new Date(right.sent_at).getTime() : 0;
      return leftSent - rightSent;
    })[0];

  if (followUpProposal) {
    items.push({
      id: `continue-proposal-${followUpProposal.id}`,
      label: `Follow up with ${followUpProposal.customerName} proposal`,
      href: `/proposals/${followUpProposal.id}`,
    });
  }

  const jobProject = [...input.projects]
    .filter((project) => ["Awarded", "Active"].includes(project.status))
    .sort(
      (left, right) =>
        new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime()
    )[0];

  if (jobProject) {
    const hasActuals = input.jobActuals.some((row) => row.project_id === jobProject.id);
    items.push({
      id: `continue-job-${jobProject.id}`,
      label: hasActuals
        ? `Review ${jobProject.project_name} job costing`
        : `Start ${jobProject.project_name} job costing`,
      href: `/projects/${jobProject.id}#job-costing`,
    });
  }

  const estimatingProject = [...input.projects]
    .filter((project) => project.status === "Estimating")
    .sort(
      (left, right) =>
        new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime()
    )[0];

  if (estimatingProject && !draftEstimate) {
    items.push({
      id: `continue-project-${estimatingProject.id}`,
      label: `Continue ${estimatingProject.project_name} estimate`,
      href: `/projects/${estimatingProject.id}`,
    });
  }

  if (items.length === 0) {
    return buildContinueOnboarding(input);
  }

  return items.slice(0, MAX_CONTINUE);
}

function dedupeById<T extends { id: string }>(items: T[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) {
      return false;
    }
    seen.add(item.id);
    return true;
  });
}

export function buildDashboardBriefing(input: BuildBriefingInput) {
  const priorityCandidates = dedupeById(buildPriorityCandidates(input))
    .sort((left, right) => right.urgency - left.urgency)
    .slice(0, MAX_PRIORITIES);

  const continueWorking = buildContinueCandidates(input);

  return {
    priorities: priorityCandidates,
    continueWorking,
    hasRisk: priorityCandidates.some((item) => item.isRisk),
  };
}
