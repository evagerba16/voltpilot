"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  CalendarRange,
  Filter,
  RefreshCw,
} from "lucide-react";

import { AnalyticsExportButtons } from "@/components/analytics/analytics-export-buttons";
import { Button } from "@/components/ui/button";
import {
  ANALYTICS_DATE_RANGES,
  ANALYTICS_SECTIONS,
  type AnalyticsData,
  type AnalyticsSection,
  type CustomerFilterOption,
  type ProjectFilterOption,
} from "@/lib/analytics/types";
import {
  buildAnalyticsUrl,
} from "@/lib/analytics/url";
import { PROJECT_STATUSES } from "@/lib/projects/types";
import { cn } from "@/lib/utils";

type AnalyticsFiltersBarProps = {
  data: AnalyticsData;
  customers: CustomerFilterOption[];
  projects: ProjectFilterOption[];
  activeSection: AnalyticsSection;
  refreshing: boolean;
  onRefresh: () => void;
};

function formatGeneratedAt(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function AnalyticsFiltersBar({
  data,
  customers,
  projects,
  activeSection,
  refreshing,
  onRefresh,
}: AnalyticsFiltersBarProps) {
  const [selectedCustomer, setSelectedCustomer] = useState(
    data.filters.customerId
  );
  const [selectedProject, setSelectedProject] = useState(data.filters.projectId);

  const visibleProjects = selectedCustomer
    ? projects.filter((project) => project.customer_id === selectedCustomer)
    : projects;

  useEffect(() => {
    if (!selectedProject) {
      return;
    }

    const matchesCustomer = visibleProjects.some(
      (project) => project.id === selectedProject
    );

    if (!matchesCustomer) {
      setSelectedProject("");
    }
  }, [selectedProject, visibleProjects]);

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="border-b border-border bg-muted/20 px-5 py-4 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Filter className="size-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold tracking-tight">
                Filters & exports
              </h2>
              <p className="text-sm text-muted-foreground">
                Refine metrics by date range, customer, and project.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CalendarRange className="size-3.5 shrink-0" />
            <span>
              Updated {formatGeneratedAt(data.generatedAt)} · use Refresh to update
            </span>
          </div>
        </div>
      </div>

      <form method="GET" className="border-b border-border px-5 py-5 sm:px-6">
        <input type="hidden" name="section" value={activeSection} />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-2">
            <label htmlFor="range" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Date range
            </label>
            <select
              id="range"
              name="range"
              defaultValue={data.filters.dateRange}
              className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {ANALYTICS_DATE_RANGES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="customer" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Customer
            </label>
            <select
              id="customer"
              name="customer"
              defaultValue={data.filters.customerId}
              onChange={(event) => setSelectedCustomer(event.target.value)}
              className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <option value="">All customers</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.company_name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="project" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Project
            </label>
            <select
              id="project"
              name="project"
              value={selectedProject}
              onChange={(event) => setSelectedProject(event.target.value)}
              className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <option value="">All projects</option>
              {visibleProjects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.project_name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="status" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Project status
            </label>
            <select
              id="status"
              name="status"
              defaultValue={data.filters.projectStatus}
              className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <option value="">All statuses</option>
              {PROJECT_STATUSES.filter((status) => status !== "Archived").map(
                (status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                )
              )}
            </select>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button type="submit">Apply filters</Button>
          <Link
            href={buildAnalyticsUrl({ section: activeSection })}
            className="inline-flex h-9 items-center justify-center rounded-lg border border-border px-4 text-sm font-medium transition-colors hover:bg-muted"
          >
            Reset
          </Link>
          <Button type="button" variant="outline" onClick={onRefresh}>
            <RefreshCw
              className={cn("mr-2 size-4", refreshing && "animate-spin")}
            />
            Refresh
          </Button>
          <AnalyticsExportButtons filters={data.filters} />
        </div>
      </form>

      <div className="flex gap-1 overflow-x-auto px-4 py-3 scrollbar-thin">
        {ANALYTICS_SECTIONS.map((section) => (
          <Link
            key={section.value}
            href={buildAnalyticsUrl({
              range: data.filters.dateRange,
              customer: data.filters.customerId,
              project: data.filters.projectId,
              status: data.filters.projectStatus,
              section: section.value,
            })}
            className={cn(
              "shrink-0 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors",
              activeSection === section.value
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {section.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
