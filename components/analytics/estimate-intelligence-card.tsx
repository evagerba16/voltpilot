"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PencilLine, Sparkles } from "lucide-react";

import { ForecastMetric } from "@/components/analytics/forecast-metric";
import {
  formatEstimateCreationTime,
  type EstimateIntelligenceResult,
} from "@/lib/analytics/analytics-service";
import { formatCurrency, formatPercent } from "@/lib/analytics/format";

type EstimateIntelligenceCardProps = {
  intelligence: EstimateIntelligenceResult;
};

function CountTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-sm shadow-md">
      <p className="font-medium">{label}</p>
      <p className="text-muted-foreground">{payload[0].value} line items</p>
    </div>
  );
}

function RankedList({
  title,
  description,
  items,
  emptyMessage,
}: {
  title: string;
  description: string;
  items: EstimateIntelligenceResult["mostCommonSections"];
  emptyMessage: string;
}) {
  return (
    <div className="rounded-lg border border-border">
      <div className="border-b border-border px-4 py-3">
        <h3 className="text-sm font-semibold">{title}</h3>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      {items.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-muted-foreground">
          {emptyMessage}
        </p>
      ) : (
        <div className="divide-y divide-border/60">
          {items.map((item) => (
            <div
              key={item.key}
              className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{item.label}</p>
                <p className="text-xs text-muted-foreground">
                  {formatPercent(item.sharePercent)} of tracked usage
                </p>
              </div>
              <span className="shrink-0 font-medium tabular-nums">{item.count}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function EstimateIntelligenceCard({
  intelligence,
}: EstimateIntelligenceCardProps) {
  const sectionChartData = intelligence.mostCommonSections.map((section) => ({
    label: section.label.replace(" costs", "").replace("Subcontractors", "Subs"),
    count: section.count,
  }));

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      <div className="flex flex-col gap-3 border-b border-border px-6 py-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Sparkles className="size-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold">Estimate Intelligence</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Production speed, revision patterns, and line-item composition.
            </p>
          </div>
        </div>
        {intelligence.source === "rules" ? (
          <span className="rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-700 dark:text-amber-400">
            Standard recommendations
          </span>
        ) : null}
      </div>

      <div className="grid gap-3 p-6 sm:grid-cols-2 xl:grid-cols-4">
        <ForecastMetric
          label="Avg creation time"
          value={formatEstimateCreationTime(intelligence.averageCreationHours)}
          hint={`${intelligence.finalizedEstimateCount} finalized estimate${intelligence.finalizedEstimateCount === 1 ? "" : "s"}`}
        />
        <ForecastMetric
          label="Avg estimate value"
          value={formatCurrency(intelligence.averageEstimateValue)}
          hint={`${intelligence.estimateCount} estimate${intelligence.estimateCount === 1 ? "" : "s"} in period`}
        />
        <ForecastMetric
          label="Avg revisions"
          value={intelligence.averageRevisionCount.toFixed(1)}
          hint="Saved estimate versions per estimate"
        />
        <ForecastMetric
          label="Avg labor share"
          value={formatPercent(intelligence.averageLaborPercent)}
          hint="Labor as a share of direct cost"
          tone="positive"
        />
        <ForecastMetric
          label="Avg material share"
          value={formatPercent(intelligence.averageMaterialPercent)}
          hint="Materials as a share of direct cost"
        />
      </div>

      <div className="grid gap-6 border-t border-border px-6 py-6 xl:grid-cols-2">
        <div>
          <div className="mb-4">
            <h3 className="text-sm font-semibold">Most common sections</h3>
            <p className="text-sm text-muted-foreground">
              Estimate categories used most often across line items.
            </p>
          </div>
          {sectionChartData.length > 0 ? (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sectionChartData} layout="vertical" margin={{ left: 12 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                  <YAxis
                    type="category"
                    dataKey="label"
                    width={88}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip content={<CountTooltip />} />
                  <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No line-item sections found for the current filters.
            </p>
          )}
        </div>

        <RankedList
          title="Most frequent materials"
          description="Top material descriptions appearing in estimates."
          items={intelligence.mostFrequentMaterials}
          emptyMessage="No material line items found for the current filters."
        />
      </div>

      <div className="border-t border-border px-6 py-4">
        <p className="flex items-start gap-1.5 text-sm text-muted-foreground">
          <PencilLine className="mt-0.5 size-4 shrink-0" />
          {intelligence.methodology}
        </p>
      </div>
    </div>
  );
}
