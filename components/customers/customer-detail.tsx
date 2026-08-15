"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, useTransition } from "react";
import {
  ArrowLeft,
  Calendar,
  FolderKanban,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";

import { deleteCustomer } from "@/app/(dashboard)/customers/actions";
import { CustomerAiInsightsCompact } from "@/components/customers/customer-ai-insights-compact";
import { CustomerAvatar } from "@/components/customers/customer-avatar";
import { CustomerDocumentsPanel } from "@/components/customers/customer-documents-panel";
import { CustomerFormDialog } from "@/components/customers/customer-form-dialog";
import { CustomerNotesPanel } from "@/components/customers/customer-notes-panel";
import { CustomerProjectsPanel } from "@/components/customers/customer-projects-panel";
import { CustomerSummaryPanel } from "@/components/customers/customer-summary-panel";
import {
  CustomerContactSidebar,
  CustomerTimeline,
} from "@/components/customers/customer-timeline";
import { EntityAttentionStrip, type AttentionItem } from "@/components/ui/entity-attention-strip";
import { EntityTabs } from "@/components/ui/entity-tabs";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { useConfirm } from "@/components/ui/confirm-provider";
import { useToast } from "@/components/ui/toast-provider";
import {
  customerStatusLabel,
  customerStatusStyles,
} from "@/lib/customers/insights";
import {
  formatCustomerDate,
  formatCustomerRelativeTime,
} from "@/lib/customers/format";
import type { CustomerProfile } from "@/lib/customers/types";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { ENTITY_PRIMARY_QUESTIONS } from "@/lib/ui/entity-page-copy";
import {
  CUSTOMER_DETAIL_TABS,
  type CustomerDetailTabId,
  parseEntityTab,
} from "@/lib/ui/entity-tab-ids";
import { cn } from "@/lib/utils";

type CustomerDetailProps = {
  profile: CustomerProfile;
  initialTab?: CustomerDetailTabId;
};

function buildAttentionItems(profile: CustomerProfile): AttentionItem[] {
  const items: AttentionItem[] = [];

  for (const proposal of profile.openProposals) {
    if (!["Sent", "Viewed", "Draft"].includes(proposal.status)) {
      continue;
    }

    items.push({
      id: `proposal-${proposal.id}`,
      label: proposal.status === "Draft" ? "Finish proposal" : "Follow up",
      title: proposal.title,
      href: `/proposals/${proposal.id}`,
    });
  }

  for (const estimate of profile.openEstimates) {
    items.push({
      id: `estimate-${estimate.id}`,
      label: estimate.status === "Draft" ? "Continue estimate" : "Review estimate",
      title: estimate.title,
      href: `/estimates/${estimate.id}`,
    });
  }

  return items.slice(0, 3);
}

export function CustomerDetail({ profile, initialTab = "overview" }: CustomerDetailProps) {
  const router = useRouter();
  const { can } = usePermissions();
  const canEdit = can("customers.edit");
  const [editOpen, setEditOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<CustomerDetailTabId>(
    parseEntityTab(initialTab, CUSTOMER_DETAIL_TABS, "overview")
  );
  const tabsSectionRef = useRef<HTMLDivElement>(null);
  const [pending, startTransition] = useTransition();
  const confirm = useConfirm();
  const { success, error: toastError } = useToast();

  const {
    customer,
    summary,
    projectCount,
    projects,
    notes,
    documents,
    timeline,
    aiInsights,
  } = profile;

  const attentionItems = useMemo(() => buildAttentionItems(profile), [profile]);
  const filteredAiInsights = useMemo(() => {
    const attentionHrefs = new Set(attentionItems.map((item) => item.href));

    return aiInsights.filter((insight) => {
      if (attentionItems.length > 0 && insight.id === "open-proposals") {
        return false;
      }

      return !attentionHrefs.has(insight.href);
    });
  }, [aiInsights, attentionItems]);

  function handleTabChange(tabId: string) {
    const nextTab = parseEntityTab(tabId, CUSTOMER_DETAIL_TABS, "overview");
    setActiveTab(nextTab);

    const href =
      nextTab === "overview"
        ? `/customers/${customer.id}`
        : `/customers/${customer.id}?tab=${nextTab}`;
    router.replace(href, { scroll: false });
  }

  async function handleDelete() {
    const confirmed = await confirm({
      title: `Remove ${customer.company_name}?`,
      description:
        "This permanently removes the customer from your directory. This can't be undone.",
      confirmLabel: "Remove customer",
      variant: "destructive",
    });

    if (!confirmed) return;

    startTransition(async () => {
      const result = await deleteCustomer(customer.id);

      if (result.error) {
        toastError(result.error);
        return;
      }

      success(`${customer.company_name} was removed.`);
      router.push("/customers");
    });
  }

  const tabs = [
    {
      id: "overview",
      label: "Overview",
      content: (
        <div className="space-y-6">
          <CustomerSummaryPanel summary={summary} compact />
          <CustomerContactSidebar
            companyName={customer.company_name}
            contactName={customer.contact_name}
            email={customer.email}
            phoneNumber={customer.phone_number}
            projectAddress={customer.project_address}
            compact
          />
          <CustomerAiInsightsCompact
            customerId={customer.id}
            customerName={customer.company_name}
            insights={filteredAiInsights}
          />
        </div>
      ),
    },
    {
      id: "activity",
      label: "Activity",
      content: (
        <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-base font-semibold tracking-tight">Activity</h2>
          <div className="mt-5">
            <CustomerTimeline
              events={timeline.slice(0, 20)}
              formatTimestamp={formatCustomerRelativeTime}
            />
          </div>
        </section>
      ),
    },
    {
      id: "notes-docs",
      label: "Notes & Docs",
      content: (
        <div className="space-y-6">
          <CustomerNotesPanel
            customerId={customer.id}
            notes={notes}
            canEdit={canEdit}
            formatTimestamp={formatCustomerRelativeTime}
          />
          <CustomerDocumentsPanel
            customerId={customer.id}
            documents={documents}
            canEdit={canEdit}
            formatTimestamp={formatCustomerRelativeTime}
          />
        </div>
      ),
    },
    {
      id: "projects",
      label: "Projects",
      content: (
        <CustomerProjectsPanel
          customerId={customer.id}
          projects={projects}
          canEdit={canEdit}
          formatTimestamp={formatCustomerRelativeTime}
        />
      ),
    },
  ];

  return (
    <div className="space-y-10">
      <Link
        href="/customers"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to customers
      </Link>

      <section className="rounded-2xl border border-border bg-card px-6 py-8 shadow-sm sm:px-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex items-start gap-4">
            <CustomerAvatar
              companyName={customer.company_name}
              contactName={customer.contact_name}
              size="lg"
            />
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                Customer
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
                    customerStatusStyles(customer.status ?? "lead")
                  )}
                >
                  {customerStatusLabel(customer.status ?? "lead")}
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Calendar className="size-3.5" />
                  Since {formatCustomerDate(customer.created_at)}
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <FolderKanban className="size-3.5" />
                  {projectCount} {projectCount === 1 ? "project" : "projects"}
                </span>
              </div>
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                {customer.company_name}
              </h1>
              <p className="text-sm text-muted-foreground">
                {ENTITY_PRIMARY_QUESTIONS.customer}
              </p>
              <p className="text-xs text-muted-foreground">
                {customer.contact_name} · {customer.email}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:items-end">
            {canEdit ? (
              <Link
                href={`/projects/new?customer=${customer.id}`}
                className={cn(buttonVariants({ className: "gap-2 rounded-full" }))}
              >
                <Plus className="size-4" />
                New project
              </Link>
            ) : null}
            {canEdit ? (
              <div className="flex flex-wrap justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => setEditOpen(true)}>
                  <Pencil data-icon="inline-start" />
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDelete}
                  disabled={pending}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 data-icon="inline-start" />
                  Delete
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

      {canEdit ? (
        <CustomerFormDialog
          open={editOpen}
          customer={customer}
          onClose={() => setEditOpen(false)}
        />
      ) : null}
    </div>
  );
}
