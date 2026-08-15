"use client";

import Link from "next/link";
import { ArrowUpRight, FileText, FolderKanban, ScrollText } from "lucide-react";

import { formatCustomerCurrency, formatCustomerRelativeTime } from "@/lib/customers/format";
import type {
  CustomerEstimateSummary,
  CustomerProjectSummary,
  CustomerProposalSummary,
} from "@/lib/customers/types";
import { cn } from "@/lib/utils";

type CustomerOpenItemsPanelProps = {
  customerId: string;
  projects: CustomerProjectSummary[];
  estimates: CustomerEstimateSummary[];
  proposals: CustomerProposalSummary[];
};

function ItemSection({
  title,
  icon: Icon,
  emptyLabel,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  emptyLabel: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border/80 bg-muted/10 p-4">
      <div className="mb-3 flex items-center gap-2">
        <Icon className="size-4 text-primary" />
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      {children ?? (
        <p className="text-sm text-muted-foreground">{emptyLabel}</p>
      )}
    </div>
  );
}

function OpenItemLink({
  href,
  title,
  meta,
}: {
  href: string;
  title: string;
  meta: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center justify-between gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-background"
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-medium group-hover:text-primary">{title}</p>
        <p className="text-xs text-muted-foreground">{meta}</p>
      </div>
      <ArrowUpRight className="size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
    </Link>
  );
}

export function CustomerOpenItemsPanel({
  customerId,
  projects,
  estimates,
  proposals,
}: CustomerOpenItemsPanelProps) {
  const activeProjects = projects.filter(
    (project) => !["Lost", "Archived", "Completed"].includes(project.status)
  );

  return (
    <section className="rounded-2xl border border-border bg-card shadow-sm">
      <div className="border-b border-border px-6 py-5">
        <h2 className="text-base font-semibold tracking-tight">Open work</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Active projects, estimates, and proposals tied to this customer.
        </p>
      </div>

      <div className="grid gap-4 p-6 lg:grid-cols-3">
        <ItemSection
          title="Active projects"
          icon={FolderKanban}
          emptyLabel="No active projects."
        >
          {activeProjects.length > 0 ? (
            <div className="space-y-1">
              {activeProjects.slice(0, 4).map((project) => (
                <OpenItemLink
                  key={project.id}
                  href={`/projects/${project.id}`}
                  title={project.project_name}
                  meta={`${project.status} · ${formatCustomerRelativeTime(project.updated_at)}`}
                />
              ))}
            </div>
          ) : null}
        </ItemSection>

        <ItemSection
          title="Open estimates"
          icon={ScrollText}
          emptyLabel="No draft estimates."
        >
          {estimates.length > 0 ? (
            <div className="space-y-1">
              {estimates.slice(0, 4).map((estimate) => (
                <OpenItemLink
                  key={estimate.id}
                  href={`/estimates/${estimate.id}`}
                  title={estimate.title}
                  meta={`${estimate.status} · ${estimate.grand_total ? formatCustomerCurrency(estimate.grand_total) : "—"}`}
                />
              ))}
            </div>
          ) : null}
        </ItemSection>

        <ItemSection
          title="Open proposals"
          icon={FileText}
          emptyLabel="No open proposals."
        >
          {proposals.length > 0 ? (
            <div className="space-y-1">
              {proposals.slice(0, 4).map((proposal) => (
                <OpenItemLink
                  key={proposal.id}
                  href={`/proposals/${proposal.id}`}
                  title={proposal.title}
                  meta={`${proposal.status} · ${proposal.amount ? formatCustomerCurrency(proposal.amount) : "—"}`}
                />
              ))}
            </div>
          ) : null}
        </ItemSection>
      </div>

      <div className="border-t border-border px-6 py-4">
        <Link
          href={`/projects?customer=${customerId}`}
          className={cn(
            "text-sm font-medium text-primary transition-colors hover:underline"
          )}
        >
          View all customer work →
        </Link>
      </div>
    </section>
  );
}
