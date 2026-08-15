"use client";

import { BookOpen } from "lucide-react";

import type { EstimateGuidance } from "@/lib/lessons/types";
import { cn } from "@/lib/utils";

const MAX_LESSONS = 3;

const categoryLabels = {
  labor: "Labor",
  materials: "Materials",
  equipment: "Equipment",
  margin: "Margin",
  change_orders: "Change orders",
  customer: "Customer history",
  project_type: "Similar work",
} as const;

type EstimateLessonsCompactProps = {
  guidance: EstimateGuidance;
};

export function EstimateLessonsCompact({ guidance }: EstimateLessonsCompactProps) {
  const items = guidance.lessons.slice(0, MAX_LESSONS);

  if (items.length === 0) {
    if (!guidance.insufficientDataMessage) {
      return null;
    }

    return (
      <section className="rounded-2xl border border-dashed border-border bg-muted/10 px-5 py-4">
        <div className="flex items-start gap-3">
          <BookOpen className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <p className="text-sm leading-relaxed text-muted-foreground">
            {guidance.insufficientDataMessage}
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <BookOpen className="size-4 text-primary" />
        <div>
          <h2 className="text-base font-semibold tracking-tight">From your completed jobs</h2>
          <p className="text-xs text-muted-foreground">
            Informational guidance from {guidance.completedJobCount} job
            {guidance.completedJobCount === 1 ? "" : "s"} with job costing — you stay in control.
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <ul className="divide-y divide-border/60">
          {items.map((lesson) => (
            <li
              key={lesson.id}
              className={cn("border-l-2 border-l-primary/30 bg-primary/[0.02] px-5 py-3.5")}
            >
              <span className="rounded-full bg-muted px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">
                {categoryLabels[lesson.category]}
              </span>
              <p className="mt-1.5 text-sm leading-relaxed">{lesson.message}</p>
              <p className="mt-1 text-xs text-muted-foreground">{lesson.evidence}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
