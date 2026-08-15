"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, useTransition } from "react";
import {
  Archive,
  ArchiveRestore,
  ArrowLeft,
  Building2,
  Calendar,
  MapPin,
  Pencil,
  User,
} from "lucide-react";

import {
  archiveProject,
  restoreProject,
} from "@/app/(dashboard)/projects/actions";
import { createEstimate } from "@/app/(dashboard)/estimates/actions";
import { JobCostingAiInsightsCompact } from "@/components/projects/job-costing-ai-insights-compact";
import { JobPerformanceHandoff } from "@/components/projects/job-performance-handoff";
import { ProjectAiInsightsCompact } from "@/components/projects/project-ai-insights-compact";
import { ProjectChangeOrdersPanel } from "@/components/projects/project-change-orders-panel";
import {
  ProjectEstimates,
  type ProjectEstimateItem,
} from "@/components/projects/project-estimates";
import { ProjectJobCostingPanel } from "@/components/projects/project-job-costing-panel";
import { ProjectJobLogsPanel } from "@/components/projects/project-job-logs-panel";
import { ProjectKpiGrid } from "@/components/projects/project-kpi-grid";
import { ProjectProgressBar } from "@/components/projects/project-progress-bar";
import { ProjectTimeline } from "@/components/projects/project-timeline";
import { EntityAttentionStrip, type AttentionItem } from "@/components/ui/entity-attention-strip";
import { EntityTabs } from "@/components/ui/entity-tabs";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { useConfirm } from "@/components/ui/confirm-provider";
import { useToast } from "@/components/ui/toast-provider";
import type { ProjectInsightWithAction } from "@/lib/projects/insights";
import type { ProjectProfile } from "@/lib/projects/profile-types";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/projects/format";
import {
  PROJECT_STATUS_STYLES,
  type ProjectWithCustomer,
} from "@/lib/projects/types";
import { usePermissions } from "@/lib/hooks/use-permissions";
import {
  isJobReadyForPerformanceReview,
  resolveJobCostingPrimaryAction,
} from "@/lib/projects/job-costing-primary-action";
import { buildJobPerformanceLessons } from "@/lib/projects/job-performance-lessons";
import { ENTITY_PRIMARY_QUESTIONS } from "@/lib/ui/entity-page-copy";
import {
  PROJECT_DETAIL_TABS,
  type ProjectDetailTabId,
  parseEntityTab,
} from "@/lib/ui/entity-tab-ids";
import { cn } from "@/lib/utils";

type ProjectDetailProps = {
  project: ProjectWithCustomer;
  profile: ProjectProfile;
  insights: ProjectInsightWithAction[];
  complexityLabel: string;
  complexityScore: number;
  insightsSummary: string;
  initialTab?: ProjectDetailTabId;
};

function DetailItem({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <div className="flex items-center gap-2 text-sm">
        {Icon ? <Icon className="size-4 text-muted-foreground" /> : null}
        <span>{value}</span>
      </div>
    </div>
  );
}

function buildAttentionItems(insights: ProjectInsightWithAction[]): AttentionItem[] {
  return insights
    .filter((insight) => insight.severity === "critical" || insight.severity === "warning")
    .slice(0, 3)
    .map((insight) => ({
      id: insight.id,
      label: insight.severity === "critical" ? "Critical" : "Review",
      title: insight.title,
      href: insight.href ?? "#",
    }));
}

export function ProjectDetail({
  project,
  profile,
  insights,
  insightsSummary,
  initialTab = "overview",
}: ProjectDetailProps) {
  const router = useRouter();
  const { can } = usePermissions();
  const canEdit = can("projects.edit");
  const [pending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState<ProjectDetailTabId>(
    parseEntityTab(initialTab, PROJECT_DETAIL_TABS, "overview")
  );
  const tabsSectionRef = useRef<HTMLDivElement>(null);
  const confirm = useConfirm();
  const { success, error: toastError } = useToast();
  const isArchived =
    project.status === "Archived" || Boolean(project.archived_at);

  const estimates: ProjectEstimateItem[] = profile.estimates.map((estimate) => ({
    id: estimate.id,
    title: estimate.title,
    status: estimate.status,
    total: estimate.total,
    updated_at: estimate.updated_at,
  }));

  const attentionItems = useMemo(
    () => buildAttentionItems(insights),
    [insights]
  );

  const overviewInsights = useMemo(
    () =>
      insights.filter(
        (insight) => insight.severity !== "critical" && insight.severity !== "warning"
      ),
    [insights]
  );

  const draftEstimate = estimates.find((estimate) => estimate.status === "Draft");

  const jobCostingActionInput = useMemo(
    () => ({
      projectId: project.id,
      customerId: project.customer.id,
      budget: profile.budget,
      field: profile.field,
      kpis: profile.kpis,
    }),
    [project.id, project.customer.id, profile.budget, profile.field, profile.kpis]
  );

  const jobCostingPrimaryAction = useMemo(
    () => resolveJobCostingPrimaryAction(jobCostingActionInput),
    [jobCostingActionInput]
  );

  const jobReadyForReview = useMemo(
    () => isJobReadyForPerformanceReview(jobCostingActionInput),
    [jobCostingActionInput]
  );

  const jobPerformanceLessons = useMemo(
    () =>
      buildJobPerformanceLessons({
        budget: profile.budget,
        field: profile.field,
        kpis: profile.kpis,
      }),
    [profile.budget, profile.field, profile.kpis]
  );

  const primaryAction = useMemo(() => {
    if (draftEstimate) {
      return {
        label: "Continue estimate",
        href: `/estimates/${draftEstimate.id}`,
        context: `Pick up "${draftEstimate.title}" where you left off.`,
        tab: null as string | null,
      };
    }

    if (estimates.length === 0 && canEdit && !isArchived) {
      return {
        label: "Create estimate",
        href: null,
        context: "Start pricing for this project.",
        tab: "estimate",
      };
    }

    const isActiveJob = ["Active", "Awarded"].includes(project.status);

    if (isActiveJob && (activeTab === "job-costing" || jobReadyForReview)) {
      return {
        label: jobCostingPrimaryAction.label,
        href: jobCostingPrimaryAction.href,
        context: jobCostingPrimaryAction.context,
        tab: null as string | null,
      };
    }

    if (isActiveJob) {
      return {
        label: "Start Job Costing",
        href: `/projects/${project.id}?tab=job-costing`,
        context: "Track actual costs against the accepted bid.",
        tab: null as string | null,
      };
    }

    return {
      label: "View estimates",
      href: null,
      context: "Review pricing and proposal readiness.",
      tab: "estimate",
    };
  }, [
    draftEstimate,
    estimates.length,
    canEdit,
    isArchived,
    project.status,
    project.id,
    activeTab,
    jobReadyForReview,
    jobCostingPrimaryAction,
  ]);

  function handleTabChange(tabId: string) {
    const nextTab = parseEntityTab(tabId, PROJECT_DETAIL_TABS, "overview");
    setActiveTab(nextTab);

    const href =
      nextTab === "overview"
        ? `/projects/${project.id}`
        : `/projects/${project.id}?tab=${nextTab}`;
    router.replace(href, { scroll: false });
  }

  function handlePrimaryAction() {
    if (primaryAction.href) {
      return;
    }

    if (primaryAction.tab) {
      handleTabChange(primaryAction.tab);
      requestAnimationFrame(() => {
        tabsSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
      return;
    }

    if (activeTab === "job-costing") {
      document.getElementById("job-costing")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }

  function handleCreateEstimate() {
    startTransition(async () => {
      const result = await createEstimate(project.id);

      if (result?.error) {
        toastError(result.error);
      }
    });
  }

  async function handleArchiveToggle() {
    const confirmed = await confirm({
      title: isArchived
        ? `Restore ${project.project_name}?`
        : `Archive ${project.project_name}?`,
      description: isArchived
        ? "This moves the project back to your active pipeline."
        : "This hides the project from your active list. You can restore it anytime.",
      confirmLabel: isArchived ? "Restore project" : "Archive project",
      variant: isArchived ? "default" : "destructive",
    });

    if (!confirmed) {
      return;
    }

    startTransition(async () => {
      const result = isArchived
        ? await restoreProject(project.id)
        : await archiveProject(project.id);

      if (result?.error) {
        toastError(result.error);
        return;
      }

      success(
        isArchived
          ? `${project.project_name} was restored.`
          : `${project.project_name} was archived.`
      );
    });
  }

  const tabs = [
    {
      id: "overview",
      label: "Overview",
      content: (
        <div className="space-y-6">
          <ProjectKpiGrid kpis={profile.kpis} compact />
          <ProjectAiInsightsCompact
            projectId={project.id}
            customerId={project.customer.id}
            projectName={project.project_name}
            insights={overviewInsights}
            summary={insightsSummary}
          />
          <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h2 className="text-base font-semibold tracking-tight">Activity</h2>
            <div className="mt-5">
              <ProjectTimeline events={profile.timeline} />
            </div>
          </section>
        </div>
      ),
    },
    {
      id: "estimate",
      label: "Estimate",
      content: (
        <ProjectEstimates
          projectId={project.id}
          projectName={project.project_name}
          estimates={estimates}
          canCreate={!isArchived}
        />
      ),
    },
    {
      id: "job-costing",
      label: "Job costing",
      content: (
        <div className="space-y-6">
          <ProjectJobCostingPanel
            projectId={project.id}
            budget={profile.budget}
            jobActuals={profile.jobActuals}
            canEdit={canEdit && !isArchived}
          />
          {jobReadyForReview ? (
            <JobPerformanceHandoff
              projectName={project.project_name}
              budget={profile.budget}
              kpis={profile.kpis}
              lessons={jobPerformanceLessons}
            />
          ) : (
            <JobCostingAiInsightsCompact
              projectId={project.id}
              customerId={project.customer.id}
              projectName={project.project_name}
              insights={insights}
            />
          )}
          <ProjectChangeOrdersPanel
            projectId={project.id}
            changeOrders={profile.field.changeOrders}
            canEdit={canEdit && !isArchived}
          />
          <ProjectJobLogsPanel
            projectId={project.id}
            jobLogs={profile.field.jobLogs}
            canEdit={canEdit && !isArchived}
          />
        </div>
      ),
    },
    {
      id: "details",
      label: "Details",
      content: (
        <div className="space-y-6">
          <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h2 className="text-base font-semibold">Project details</h2>
            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <DetailItem
                label="Customer"
                value={project.customer.company_name}
                icon={Building2}
              />
              <DetailItem label="Project type" value={project.project_type} />
              <DetailItem
                label="Assigned estimator"
                value={project.assigned_estimator || "—"}
                icon={User}
              />
              <DetailItem
                label="Bid due date"
                value={formatDate(project.bid_due_date)}
                icon={Calendar}
              />
              <DetailItem
                label="Estimated contract value"
                value={formatCurrency(project.estimated_value)}
              />
              <DetailItem
                label="Project address"
                value={project.project_address || "—"}
                icon={MapPin}
              />
            </div>
          </section>
          <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h2 className="text-base font-semibold">Customer contact</h2>
            <div className="mt-4 space-y-3 text-sm">
              <div>
                <p className="font-medium">{project.customer.contact_name}</p>
                <p className="text-muted-foreground">{project.customer.email}</p>
              </div>
              <Link
                href={`/customers/${project.customer.id}`}
                className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
              >
                View customer
              </Link>
            </div>
          </section>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-10">
      <Link
        href="/projects"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to projects
      </Link>

      <section className="rounded-2xl border border-border bg-card px-6 py-8 shadow-sm sm:px-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl space-y-3">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Project
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
                  PROJECT_STATUS_STYLES[project.status]
                )}
              >
                {project.status}
              </span>
              <span className="text-xs text-muted-foreground">
                Updated {formatDateTime(project.updated_at)}
              </span>
            </div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              {project.project_name}
            </h1>
            <p className="text-sm text-muted-foreground">
              {project.status === "Awarded"
                ? ENTITY_PRIMARY_QUESTIONS.projectExecution
                : ENTITY_PRIMARY_QUESTIONS.project}
            </p>
            <p className="text-xs text-muted-foreground">
              {project.customer.company_name}
              {project.project_address ? ` · ${project.project_address}` : ""}
            </p>
            <div className="max-w-md pt-1">
              <ProjectProgressBar value={profile.kpis.progressPercent} />
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:max-w-xs sm:items-end">
            {primaryAction.href ? (
              <Link
                href={primaryAction.href}
                className={cn(buttonVariants({ className: "gap-2 rounded-full" }))}
              >
                {primaryAction.label}
              </Link>
            ) : primaryAction.label === "Create estimate" ? (
              <Button
                className="rounded-full"
                onClick={handleCreateEstimate}
                disabled={pending}
              >
                {primaryAction.label}
              </Button>
            ) : (
              <Button className="rounded-full" onClick={handlePrimaryAction}>
                {primaryAction.label}
              </Button>
            )}
            <p className="text-right text-xs leading-relaxed text-muted-foreground">
              {primaryAction.context}
            </p>
            {canEdit ? (
              <div className="flex flex-wrap justify-end gap-2">
                <Link
                  href={`/projects/${project.id}/edit`}
                  className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
                >
                  <Pencil className="size-4" />
                  Edit
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleArchiveToggle}
                  disabled={pending}
                >
                  {isArchived ? (
                    <>
                      <ArchiveRestore data-icon="inline-start" />
                      Restore
                    </>
                  ) : (
                    <>
                      <Archive data-icon="inline-start" />
                      Archive
                    </>
                  )}
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {attentionItems.length > 0 ? (
        <EntityAttentionStrip items={attentionItems} />
      ) : null}

      <div ref={tabsSectionRef}>
        <EntityTabs
          tabs={tabs}
          activeTabId={activeTab}
          onTabChange={handleTabChange}
        />
      </div>
    </div>
  );
}
