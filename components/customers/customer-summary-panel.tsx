"use client";

import { DollarSign, FileText, FolderKanban, Receipt, ScrollText } from "lucide-react";

import { formatCustomerCurrency, formatCustomerRelativeTime } from "@/lib/customers/format";
import type { CustomerProfileSummary } from "@/lib/customers/types";
import { cn } from "@/lib/utils";

type CustomerSummaryPanelProps = {
  summary: CustomerProfileSummary;
  compact?: boolean;
};

function SummaryCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <article className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <Icon className="size-3.5 text-primary" />
        {label}
      </div>
      <p className="mt-2 text-2xl font-bold tracking-tight tabular-nums">{value}</p>
    </article>
  );
}

export function CustomerSummaryPanel({ summary, compact = false }: CustomerSummaryPanelProps) {
  const cards = compact
    ? [
        {
          label: "Active projects",
          value: String(summary.activeProjectCount),
          icon: FolderKanban,
        },
        {
          label: "Open proposals",
          value: String(summary.openProposalCount),
          icon: FileText,
        },
        {
          label: "Open contract value",
          value:
            summary.openContractValue > 0
              ? formatCustomerCurrency(summary.openContractValue)
              : "—",
          icon: Receipt,
        },
      ]
    : [
        {
          label: "Total revenue",
          value: formatCustomerCurrency(summary.totalRevenue),
          icon: DollarSign,
        },
        {
          label: "Active projects",
          value: String(summary.activeProjectCount),
          icon: FolderKanban,
        },
        {
          label: "Open estimates",
          value: String(summary.openEstimateCount),
          icon: ScrollText,
        },
        {
          label: "Open proposals",
          value: String(summary.openProposalCount),
          icon: FileText,
        },
        {
          label: "Open contract value",
          value:
            summary.openContractValue > 0
              ? formatCustomerCurrency(summary.openContractValue)
              : "—",
          icon: Receipt,
        },
      ];

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-base font-semibold tracking-tight">
          {compact ? "At a glance" : "Revenue summary"}
        </h2>
        {!compact && summary.lastActivityAt ? (
          <p className="text-sm text-muted-foreground">
            Last activity {formatCustomerRelativeTime(summary.lastActivityAt)}
          </p>
        ) : null}
      </div>

      <div
        className={cn(
          "grid gap-3",
          compact ? "sm:grid-cols-2 xl:grid-cols-3" : "sm:grid-cols-2 xl:grid-cols-5"
        )}
      >
        {cards.map((card) => (
          <SummaryCard key={card.label} {...card} />
        ))}
      </div>
    </section>
  );
}
