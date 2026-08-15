"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ArrowUpRight,
  Pencil,
  Trash2,
  Users,
} from "lucide-react";

import { deleteCustomer } from "@/app/(dashboard)/customers/actions";
import { CustomerAvatar } from "@/components/customers/customer-avatar";
import { CustomerFormDialog } from "@/components/customers/customer-form-dialog";
import { CustomersPagination } from "@/components/customers/customers-pagination";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { EmptyState } from "@/components/ui/empty-state";
import { Spinner } from "@/components/ui/spinner";
import { useConfirm } from "@/components/ui/confirm-provider";
import { useToast } from "@/components/ui/toast-provider";
import { usePermissions } from "@/lib/hooks/use-permissions";
import {
  customerStatusLabel,
  customerStatusStyles,
} from "@/lib/customers/insights";
import {
  formatCustomerCurrency,
  formatCustomerRelativeTime,
} from "@/lib/customers/format";
import { buildCustomersUrl } from "@/lib/customers/url";
import type {
  CustomerListItem,
  CustomerNotesFilter,
  CustomerProjectFilter,
  CustomerSortField,
  CustomerStatusFilter,
} from "@/lib/customers/types";
import { CUSTOMER_STATUS_FILTERS } from "@/lib/customers/types";
import { cn } from "@/lib/utils";

type CustomersTableProps = {
  customers: CustomerListItem[];
  total: number;
  page: number;
  totalPages: number;
  search: string;
  instantSearch: string;
  sort: CustomerSortField;
  order: "asc" | "desc";
  projectFilter: CustomerProjectFilter;
  notesFilter: CustomerNotesFilter;
  statusFilter: CustomerStatusFilter;
  onAddCustomer?: () => void;
};

function SortIcon({
  column,
  sort,
  order,
}: {
  column: CustomerSortField;
  sort: CustomerSortField;
  order: "asc" | "desc";
}) {
  if (sort !== column) {
    return <ArrowUpDown className="size-3.5 opacity-40" />;
  }

  return order === "asc" ? (
    <ArrowUp className="size-3.5" />
  ) : (
    <ArrowDown className="size-3.5" />
  );
}

function getNextOrder(
  column: CustomerSortField,
  sort: CustomerSortField,
  order: "asc" | "desc"
) {
  if (sort === column) {
    return order === "asc" ? "desc" : "asc";
  }

  return "asc";
}

function matchesInstantSearch(customer: CustomerListItem, query: string) {
  if (!query.trim()) {
    return true;
  }

  const haystack = [
    customer.company_name,
    customer.contact_name,
    customer.email,
    customer.phone_number ?? "",
    customer.project_address ?? "",
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(query.trim().toLowerCase());
}

function CustomerActions({ customer }: { customer: CustomerListItem }) {
  const { can } = usePermissions();
  const canEdit = can("customers.edit");
  const [editingCustomer, setEditingCustomer] = useState<CustomerListItem | null>(null);
  const [pending, startTransition] = useTransition();
  const confirm = useConfirm();
  const { success, error: toastError } = useToast();

  async function handleDelete() {
    const confirmed = await confirm({
      title: `Remove ${customer.company_name}?`,
      description:
        "This permanently removes the customer from your directory. This can't be undone.",
      confirmLabel: "Remove customer",
      variant: "destructive",
    });

    if (!confirmed) {
      return;
    }

    startTransition(async () => {
      const result = await deleteCustomer(customer.id);

      if (result.error) {
        toastError(result.error);
        return;
      }

      success(`${customer.company_name} was removed.`);
    });
  }

  if (!canEdit) {
    return null;
  }

  return (
    <>
      <div
        className="flex items-center justify-end gap-1"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => setEditingCustomer(customer)}
          className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }))}
          aria-label={`Edit ${customer.company_name}`}
        >
          <Pencil className="size-3.5" />
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={pending}
          className={cn(
            buttonVariants({ variant: "ghost", size: "icon-sm" }),
            "text-destructive hover:bg-destructive/10 hover:text-destructive"
          )}
          aria-label={`Delete ${customer.company_name}`}
        >
          {pending ? <Spinner className="size-3.5" /> : <Trash2 className="size-3.5" />}
        </button>
      </div>

      <CustomerFormDialog
        open={Boolean(editingCustomer)}
        customer={editingCustomer}
        onClose={() => setEditingCustomer(null)}
      />
    </>
  );
}

export function CustomersTable({
  customers,
  total,
  page,
  totalPages,
  search,
  instantSearch,
  sort,
  order,
  projectFilter,
  notesFilter,
  statusFilter,
  onAddCustomer,
}: CustomersTableProps) {
  const { can } = usePermissions();
  const canEdit = can("customers.edit");

  const visibleCustomers = useMemo(
    () => customers.filter((customer) => matchesInstantSearch(customer, instantSearch)),
    [customers, instantSearch]
  );

  const isInstantFiltering =
    instantSearch.trim() !== "" && instantSearch.trim() !== search.trim();

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      {isInstantFiltering ? (
        <div className="border-b border-border bg-muted/20 px-6 py-2 text-xs text-muted-foreground">
          Showing {visibleCustomers.length} match{visibleCustomers.length === 1 ? "" : "es"} on this page — updating full results…
        </div>
      ) : null}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[880px] text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th scope="col" className="px-6 py-3 font-medium text-muted-foreground">
                Customer
              </th>
              <th scope="col" className="hidden px-6 py-3 font-medium text-muted-foreground md:table-cell">
                <Link
                  href={buildCustomersUrl({
                    q: search,
                    sort: "status",
                    order: getNextOrder("status", sort, order),
                    page: 1,
                    projects: projectFilter,
                    notes: notesFilter,
                    status: statusFilter,
                  })}
                  className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground"
                >
                  Status
                  <SortIcon column="status" sort={sort} order={order} />
                </Link>
              </th>
              <th scope="col" className="px-6 py-3 font-medium text-muted-foreground">
                Revenue
              </th>
              <th scope="col" className="hidden px-6 py-3 font-medium text-muted-foreground sm:table-cell">
                Active
              </th>
              <th scope="col" className="hidden px-6 py-3 font-medium text-muted-foreground lg:table-cell">
                Last activity
              </th>
              <th scope="col" className="px-6 py-3 text-right font-medium text-muted-foreground">
                {canEdit ? "Actions" : null}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {visibleCustomers.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-0">
                  <EmptyState
                    icon={Users}
                    title={
                      search || instantSearch
                        ? "No customers match your search"
                        : statusFilter !== "all"
                          ? `No ${CUSTOMER_STATUS_FILTERS.find((option) => option.value === statusFilter)?.label.toLowerCase() ?? "matching"} customers`
                          : "No customers yet"
                    }
                    description={
                      search || instantSearch
                        ? "Try a different company name, contact, or email."
                        : "Add customers first so you can link projects, estimates, and proposals to the right GCs and owners."
                    }
                    action={
                      search || instantSearch ? (
                        <Link
                          href="/customers"
                          className={buttonVariants({ variant: "outline" })}
                        >
                          Clear search
                        </Link>
                      ) : onAddCustomer && canEdit ? (
                        <Button onClick={onAddCustomer}>Add your first customer</Button>
                      ) : null
                    }
                    className="py-14"
                  />
                </td>
              </tr>
            ) : (
              visibleCustomers.map((customer, index) => (
                <tr
                  key={customer.id}
                  className={cn(
                    "group transition-all motion-safe:duration-200 hover:bg-muted/20",
                    "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1 motion-safe:fill-mode-backwards"
                  )}
                  style={{ animationDelay: `${index * 35}ms` }}
                >
                  <td className="px-6 py-4">
                    <Link href={`/customers/${customer.id}`} className="flex items-center gap-3">
                      <CustomerAvatar
                        companyName={customer.company_name}
                        contactName={customer.contact_name}
                        size="sm"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate font-medium transition-colors group-hover:text-primary">
                              {customer.company_name}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {customer.contact_name} · {customer.email}
                            </p>
                          </div>
                          <ArrowUpRight className="size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                        </div>
                      </div>
                    </Link>
                  </td>
                  <td className="hidden px-6 py-4 md:table-cell">
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
                        customerStatusStyles(customer.status ?? "lead")
                      )}
                    >
                      {customerStatusLabel(customer.status ?? "lead")}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-medium tabular-nums">
                    {customer.total_revenue > 0
                      ? formatCustomerCurrency(customer.total_revenue)
                      : "—"}
                  </td>
                  <td className="hidden px-6 py-4 sm:table-cell">
                    <span className="inline-flex min-w-8 items-center justify-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                      {customer.active_project_count}
                    </span>
                  </td>
                  <td className="hidden px-6 py-4 text-muted-foreground lg:table-cell">
                    {customer.last_activity_at
                      ? formatCustomerRelativeTime(customer.last_activity_at)
                      : "—"}
                  </td>
                  <td className="px-6 py-4">
                    {canEdit ? <CustomerActions customer={customer} /> : null}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {total > 0 ? (
        <CustomersPagination
          page={page}
          totalPages={totalPages}
          total={total}
          search={search}
          sort={sort}
          order={order}
          projects={projectFilter}
          notes={notesFilter}
          status={statusFilter}
        />
      ) : null}
    </div>
  );
}
