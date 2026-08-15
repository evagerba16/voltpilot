import type {
  CompletedJobRecord,
  EstimatingLesson,
  EstimateGuidance,
  EstimateGuidanceContext,
  LessonCategory,
} from "@/lib/lessons/types";

const MIN_JOBS_TYPE_PATTERN = 2;
const MIN_JOBS_CONSISTENT = 3;
const CATEGORY_OVERRUN_THRESHOLD = 10;
const STRONG_OVERRUN_THRESHOLD = 15;

function average(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function formatProjectTypeLabel(projectType: string) {
  return projectType.toLowerCase();
}

function categoryVariance(jobs: CompletedJobRecord[], categoryKey: string) {
  return jobs
    .map((job) => {
      const category = job.budget.categories.find((item) => item.key === categoryKey);
      return category?.variancePercent ?? 0;
    })
    .filter((value) => Number.isFinite(value));
}

function jobsOverCategoryThreshold(jobs: CompletedJobRecord[], categoryKey: string) {
  return jobs.filter((job) => {
    const category = job.budget.categories.find((item) => item.key === categoryKey);
    return (category?.variancePercent ?? 0) > CATEGORY_OVERRUN_THRESHOLD && category!.estimated > 0;
  });
}

function pushLesson(
  lessons: EstimatingLesson[],
  lesson: EstimatingLesson,
  seen: Set<string>
) {
  if (seen.has(lesson.id)) {
    return;
  }

  seen.add(lesson.id);
  lessons.push(lesson);
}

function buildLaborLesson(
  typeJobs: CompletedJobRecord[],
  projectType: string,
  seen: Set<string>,
  lessons: EstimatingLesson[]
) {
  const overruns = jobsOverCategoryThreshold(typeJobs, "labor");

  if (overruns.length < MIN_JOBS_TYPE_PATTERN) {
    return;
  }

  const variances = categoryVariance(overruns, "labor");
  const avgOverrun = average(variances);

  if (avgOverrun < CATEGORY_OVERRUN_THRESHOLD) {
    return;
  }

  const label = formatProjectTypeLabel(projectType);
  const consistent = overruns.length >= MIN_JOBS_CONSISTENT;

  pushLesson(lessons, {
    id: `labor-${projectType}`,
    category: "labor",
    message: consistent
      ? `Similar ${label} projects averaged ${avgOverrun.toFixed(0)}% more labor than estimated.`
      : `${overruns.length} recent ${label} jobs ran ${avgOverrun.toFixed(0)}% over on labor.`,
    evidence: `Based on ${overruns.length} completed job${overruns.length === 1 ? "" : "s"} with job costing data`,
    sampleSize: overruns.length,
    source: "project_type",
    projectType,
  }, seen);
}

function buildMaterialsLesson(
  typeJobs: CompletedJobRecord[],
  projectType: string,
  seen: Set<string>,
  lessons: EstimatingLesson[]
) {
  const overruns = jobsOverCategoryThreshold(typeJobs, "materials");

  if (overruns.length < MIN_JOBS_TYPE_PATTERN) {
    return;
  }

  const variances = categoryVariance(overruns, "materials");
  const avgOverrun = average(variances);

  if (avgOverrun < CATEGORY_OVERRUN_THRESHOLD) {
    return;
  }

  const label = formatProjectTypeLabel(projectType);

  pushLesson(lessons, {
    id: `materials-${projectType}`,
    category: "materials",
    message:
      overruns.length >= MIN_JOBS_CONSISTENT
        ? `Material costs on ${label} projects averaged ${avgOverrun.toFixed(0)}% over estimate — check waste factors and buyout timing.`
        : `Recent ${label} jobs exceeded material estimates by ${avgOverrun.toFixed(0)}% on average.`,
    evidence: `Based on ${overruns.length} completed job${overruns.length === 1 ? "" : "s"}`,
    sampleSize: overruns.length,
    source: "project_type",
    projectType,
  }, seen);
}

function buildLaborHoursLesson(
  typeJobs: CompletedJobRecord[],
  projectType: string,
  seen: Set<string>,
  lessons: EstimatingLesson[]
) {
  const overLogged = typeJobs.filter(
    (job) =>
      job.estimatedLaborHours > 0 &&
      job.totalLogHours > job.estimatedLaborHours * 1.15
  );

  if (overLogged.length < MIN_JOBS_TYPE_PATTERN) {
    return;
  }

  const label = formatProjectTypeLabel(projectType);

  pushLesson(lessons, {
    id: `field-hours-${projectType}`,
    category: "labor",
    message:
      overLogged.length >= MIN_JOBS_CONSISTENT
        ? `Similar ${label} projects typically need more field hours than the labor estimate — consider crew size or an extra technician.`
        : `${overLogged.length} ${label} jobs logged more field hours than estimated labor.`,
    evidence: `Based on ${overLogged.length} completed job${overLogged.length === 1 ? "" : "s"} with daily logs`,
    sampleSize: overLogged.length,
    source: "project_type",
    projectType,
  }, seen);
}

function buildChangeOrderLesson(
  typeJobs: CompletedJobRecord[],
  allJobs: CompletedJobRecord[],
  projectType: string,
  seen: Set<string>,
  lessons: EstimatingLesson[]
) {
  if (typeJobs.length < MIN_JOBS_TYPE_PATTERN) {
    return;
  }

  const typeAvgCo =
    average(typeJobs.map((job) => job.changeOrderCount));
  const portfolioAvgCo = average(allJobs.map((job) => job.changeOrderCount));

  if (typeAvgCo < 1.5 || typeAvgCo <= portfolioAvgCo * 1.25) {
    return;
  }

  const label = formatProjectTypeLabel(projectType);

  pushLesson(lessons, {
    id: `change-orders-${projectType}`,
    category: "change_orders",
    message: `${projectType} projects average ${typeAvgCo.toFixed(1)} change orders — pad scope allowances or tighten pre-bid clarifications on similar work.`,
    evidence: `Compared across ${typeJobs.length} completed ${label} jobs`,
    sampleSize: typeJobs.length,
    source: "project_type",
    projectType,
  }, seen);
}

function buildMarginChangeOrderLesson(
  jobs: CompletedJobRecord[],
  seen: Set<string>,
  lessons: EstimatingLesson[]
) {
  const affected = jobs.filter(
    (job) => job.changeOrderCount >= 2 && job.grossMarginPercent > 0 && job.grossMarginPercent < 12
  );

  if (affected.length < MIN_JOBS_TYPE_PATTERN) {
    return;
  }

  pushLesson(lessons, {
    id: "margin-change-orders",
    category: "margin",
    message: `Jobs with multiple change orders often finished below 12% margin — protect markup and track CO cost impact early.`,
    evidence: `Based on ${affected.length} completed jobs with 2+ change orders`,
    sampleSize: affected.length,
    source: "portfolio",
  }, seen);
}

function buildCustomerMarginLesson(
  customerJobs: CompletedJobRecord[],
  allJobs: CompletedJobRecord[],
  customerName: string,
  seen: Set<string>,
  lessons: EstimatingLesson[]
) {
  if (customerJobs.length < MIN_JOBS_TYPE_PATTERN) {
    return;
  }

  const customerMargins = customerJobs
    .map((job) => job.grossMarginPercent)
    .filter((value) => value > 0);

  const portfolioMargins = allJobs
    .map((job) => job.grossMarginPercent)
    .filter((value) => value > 0);

  if (customerMargins.length < MIN_JOBS_TYPE_PATTERN || portfolioMargins.length < MIN_JOBS_TYPE_PATTERN) {
    return;
  }

  const customerAvg = average(customerMargins);
  const portfolioAvg = average(portfolioMargins);
  const delta = customerAvg - portfolioAvg;

  if (Math.abs(delta) < 3) {
    return;
  }

  pushLesson(lessons, {
    id: `customer-margin-${customerJobs[0]?.customerId ?? "unknown"}`,
    category: "customer",
    message:
      delta > 0
        ? `${customerName} projects average ${customerAvg.toFixed(1)}% margin — ${Math.abs(delta).toFixed(1)} points above your portfolio norm.`
        : `${customerName} projects average ${customerAvg.toFixed(1)}% margin — ${Math.abs(delta).toFixed(1)} points below your portfolio norm; review pricing on the next bid.`,
    evidence: `Based on ${customerJobs.length} completed jobs for this customer`,
    sampleSize: customerJobs.length,
    source: "customer",
    customerId: customerJobs[0]?.customerId,
  }, seen);
}

function buildScopeKeywordLessons(
  typeJobs: CompletedJobRecord[],
  seen: Set<string>,
  lessons: EstimatingLesson[]
) {
  const undergroundJobs = typeJobs.filter((job) =>
    /underground|service|conduit|trench/i.test(job.projectName)
  );

  if (undergroundJobs.length >= MIN_JOBS_TYPE_PATTERN) {
    const overruns = jobsOverCategoryThreshold(undergroundJobs, "materials");

    if (overruns.length >= MIN_JOBS_TYPE_PATTERN) {
      const avgOverrun = average(categoryVariance(overruns, "materials"));

      if (avgOverrun >= STRONG_OVERRUN_THRESHOLD) {
        pushLesson(
          lessons,
          {
            id: "underground-materials",
            category: "materials",
            message: `Last ${overruns.length} underground/service jobs exceeded conduit and material estimates by ${avgOverrun.toFixed(0)}% on average.`,
            evidence: `Based on ${overruns.length} completed jobs with matching scope`,
            sampleSize: overruns.length,
            source: "project_type",
            scopePattern: "underground",
          },
          seen
        );
      }
    }
  }

  const electricalRoomJobs = typeJobs.filter((job) =>
    /electrical room|switchgear|gear room|mdp|panelboard/i.test(job.projectName)
  );

  if (electricalRoomJobs.length >= MIN_JOBS_TYPE_PATTERN) {
    const overruns = jobsOverCategoryThreshold(electricalRoomJobs, "labor");

    if (overruns.length >= MIN_JOBS_TYPE_PATTERN) {
      const avgOverrun = average(categoryVariance(overruns, "labor"));

      if (avgOverrun >= STRONG_OVERRUN_THRESHOLD) {
        pushLesson(
          lessons,
          {
            id: "electrical-room-labor",
            category: "labor",
            message: `Electrical room work on recent jobs exceeded labor estimates by ${avgOverrun.toFixed(0)}% — allow extra coordination and pull time.`,
            evidence: `Based on ${overruns.length} completed jobs with electrical room scope`,
            sampleSize: overruns.length,
            source: "project_type",
            scopePattern: "electrical_room",
          },
          seen
        );
      }
    }
  }
}

const categoryPriority: Record<LessonCategory, number> = {
  labor: 0,
  materials: 1,
  margin: 2,
  change_orders: 3,
  customer: 4,
  project_type: 5,
  equipment: 6,
};

/** Analyze completed jobs and produce portfolio-wide estimating lessons. */
export function buildLessonsFromCompletedJobs(
  jobs: CompletedJobRecord[]
): EstimatingLesson[] {
  if (jobs.length === 0) {
    return [];
  }

  const lessons: EstimatingLesson[] = [];
  const seen = new Set<string>();

  const jobsByType = new Map<string, CompletedJobRecord[]>();
  for (const job of jobs) {
    const list = jobsByType.get(job.projectType) ?? [];
    list.push(job);
    jobsByType.set(job.projectType, list);
  }

  buildMarginChangeOrderLesson(jobs, seen, lessons);

  for (const [projectType, typeJobs] of jobsByType) {
    buildLaborLesson(typeJobs, projectType, seen, lessons);
    buildMaterialsLesson(typeJobs, projectType, seen, lessons);
    buildLaborHoursLesson(typeJobs, projectType, seen, lessons);
    buildChangeOrderLesson(typeJobs, jobs, projectType, seen, lessons);
    buildScopeKeywordLessons(typeJobs, seen, lessons);
  }

  return lessons.sort((left, right) => {
    const sourceRank =
      { project_type: 0, customer: 1, portfolio: 2 }[left.source] -
      { project_type: 0, customer: 1, portfolio: 2 }[right.source];

    if (sourceRank !== 0) {
      return sourceRank;
    }

    return categoryPriority[left.category] - categoryPriority[right.category];
  });
}

function isLessonRelevant(lesson: EstimatingLesson, context: EstimateGuidanceContext) {
  if (lesson.scopePattern === "underground") {
    return /underground|service|conduit|trench/i.test(context.projectName);
  }

  if (lesson.scopePattern === "electrical_room") {
    return /electrical room|switchgear|gear room|mdp|panelboard/i.test(context.projectName);
  }

  if (lesson.source === "project_type" && lesson.projectType) {
    return lesson.projectType === context.projectType;
  }

  if (lesson.source === "customer" && lesson.customerId) {
    return lesson.customerId === context.customerId;
  }

  return lesson.source === "portfolio";
}

/** Filter and prioritize lessons for a specific estimate context. */
export function buildEstimateGuidance(
  completedJobs: CompletedJobRecord[],
  context: EstimateGuidanceContext
): EstimateGuidance {
  const portfolioLessons = buildLessonsFromCompletedJobs(completedJobs);

  if (completedJobs.length === 0) {
    return {
      lessons: [],
      completedJobCount: 0,
      hasHistoricalData: false,
      insufficientDataMessage:
        "No completed jobs with job costing yet — lessons will appear after you track actuals on finished work.",
    };
  }

  if (completedJobs.length === 1) {
    return {
      lessons: [],
      completedJobCount: 1,
      hasHistoricalData: false,
      insufficientDataMessage:
        "One completed job on record — add job costing to one more project to unlock estimating lessons.",
    };
  }

  const typeJobs = completedJobs.filter((job) => job.projectType === context.projectType);
  const customerJobs = completedJobs.filter((job) => job.customerId === context.customerId);

  const seen = new Set<string>();
  const relevant: EstimatingLesson[] = [];

  for (const lesson of portfolioLessons) {
    if (!isLessonRelevant(lesson, context)) {
      continue;
    }

    if (!seen.has(lesson.id)) {
      seen.add(lesson.id);
      relevant.push(lesson);
    }
  }

  buildCustomerMarginLesson(
    customerJobs,
    completedJobs,
    context.customerName,
    seen,
    relevant
  );

  if (relevant.length === 0 && typeJobs.length >= MIN_JOBS_TYPE_PATTERN) {
    const avgVariance = average(typeJobs.map((job) => job.budget.variancePercent));

    if (Math.abs(avgVariance) >= CATEGORY_OVERRUN_THRESHOLD) {
      relevant.push({
        id: `type-variance-${context.projectType}`,
        category: "project_type",
        message:
          avgVariance > 0
            ? `Similar ${formatProjectTypeLabel(context.projectType)} projects averaged ${Math.abs(avgVariance).toFixed(0)}% over estimate overall.`
            : `Similar ${formatProjectTypeLabel(context.projectType)} projects came in ${Math.abs(avgVariance).toFixed(0)}% under estimate overall.`,
        evidence: `Based on ${typeJobs.length} completed ${formatProjectTypeLabel(context.projectType)} jobs`,
        sampleSize: typeJobs.length,
        source: "project_type",
        projectType: context.projectType,
      });
    }
  }

  return {
    lessons: relevant.slice(0, 5),
    completedJobCount: completedJobs.length,
    hasHistoricalData: relevant.length > 0,
    insufficientDataMessage:
      relevant.length === 0
        ? "Not enough comparable completed jobs yet — lessons appear when similar work has job costing history."
        : null,
  };
}
