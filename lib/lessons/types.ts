export type LessonCategory =
  | "labor"
  | "materials"
  | "equipment"
  | "margin"
  | "change_orders"
  | "customer"
  | "project_type";

export type LessonSource = "project_type" | "customer" | "portfolio";

/** Practical estimating guidance derived from completed job history. */
export type EstimatingLesson = {
  id: string;
  category: LessonCategory;
  message: string;
  evidence: string;
  sampleSize: number;
  source: LessonSource;
  projectType?: string;
  customerId?: string;
  scopePattern?: "underground" | "electrical_room";
};

export type CompletedJobRecord = {
  projectId: string;
  projectName: string;
  projectType: string;
  customerId: string;
  customerName: string;
  budget: {
    estimatedTotal: number;
    actualTotal: number;
    variancePercent: number;
    categories: Array<{
      key: string;
      label: string;
      estimated: number;
      actual: number;
      variancePercent: number;
    }>;
  };
  changeOrderCount: number;
  grossMarginPercent: number;
  totalLogHours: number;
  estimatedLaborHours: number;
};

export type EstimateGuidanceContext = {
  projectId: string;
  projectName: string;
  projectType: string;
  customerId: string;
  customerName: string;
};

export type EstimateGuidance = {
  lessons: EstimatingLesson[];
  completedJobCount: number;
  hasHistoricalData: boolean;
  insufficientDataMessage: string | null;
};
