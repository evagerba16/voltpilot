"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Pencil,
  Trash2,
  Users,
} from "lucide-react";

import { deleteCustomer } from "@/app/(dashboard)/customers/actions";
import { CustomerFormDialog } from "@/components/customers/customer-form-dialog";
import { CustomersPagination } from "@/components/customers/customers-pagination";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { EmptyState } from "@/components/ui/empty-state";
import { Spinner } from "@/components/ui/spinner";
import { useConfirm } from "@/components/ui/confirm-provider";
import { useToast } from "@/components/ui/toast-provider";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { buildCustomersUrl } from "@/lib/customers/url";
import type { Customer, CustomerSortField } from "@/lib/customers/types";
import { cn } from "@/lib/utils";

type CustomersTableProps = {
  customers: Customer[];
  total: number;
  page: number;
  totalPages: number;
  search: string;
  sort: CustomerSortField;
  order: "asc" | "desc";
  onAddCustomer?: () => void;
};

type SortableColumn = {
  key: CustomerSortField;
  label: string;
  className?: string;
};

const columns: SortableColumn[] = [
  { key: "company_name", label: "Company" },
  { key: "contact_name", label: "Contact" },
  { key: "email", label: "Email" },
  { key: "created_at", label: "Added", className: "hidden lg:table-cell" },
];

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

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function CustomerActions({ customer }: { customer: Customer }) {
  const { can } = usePermissions();
  const canEdit = can("customers.edit");
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
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
          {pending ? (
            <Spinner className="size-3.5" />
          ) : (
            <Trash2 className="size-3.5" />
          )}
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
  sort,
  order,
  onAddCustomer,
}: CustomersTableProps) {
  const { can } = usePermissions();
  const canEdit = can("customers.edit");

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={cn(
                    "px-6 py-3 font-medium text-muted-foreground",
                    column.className
                  )}
                >
                  <Link
                    href={buildCustomersUrl({
                      q: search,
                      sort: column.key,
                      order: getNextOrder(column.key, sort, order),
                      page: 1,
                    })}
                    className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground"
                  >
                    {column.label}
                    <SortIcon column={column.key} sort={sort} order={order} />
                  </Link>
                </th>
              ))}
              <th
                scope="col"
                className="hidden px-6 py-3 font-medium text-muted-foreground md:table-cell"
              >
                Phone
              </th>
              <th
                scope="col"
                className="hidden px-6 py-3 font-medium text-muted-foreground xl:table-cell"
              >
                Project address
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-right font-medium text-muted-foreground"
              >
                {canEdit ? "Actions" : null}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {customers.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-0">
                  <EmptyState
                    icon={Users}
                    title={
                      search
                        ? "No customers match your search"
                        : "No customers yet"
                    }
                    description={
                      search
                        ? "Try a different company name, contact, or email."
                        : "Add customers first so you can link projects, estimates, and proposals to the right GCs and owners."
                    }
                    action={
                      search ? (
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
                  />
                </td>
              </tr>
            ) : (
              customers.map((customer) => (
                <tr
                  key={customer.id}
                  className="transition-colors hover:bg-muted/20"
                >
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium">{customer.company_name}</p>
                      {customer.notes ? (
                        <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                          {customer.notes}
                        </p>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-6 py-4">{customer.contact_name}</td>
                  <td className="px-6 py-4">
                    <a
                      href={`mailto:${customer.email}`}
                      className="text-primary hover:underline"
                    >
                      {customer.email}
                    </a>
                  </td>
                  <td className="hidden px-6 py-4 text-muted-foreground lg:table-cell">
                    {formatDate(customer.created_at)}
                  </td>
                  <td className="hidden px-6 py-4 text-muted-foreground md:table-cell">
                    {customer.phone_number || "—"}
                  </td>
                  <td className="hidden max-w-xs truncate px-6 py-4 text-muted-foreground xl:table-cell">
                    {customer.project_address || "—"}
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
        />
      ) : null}
    </div>
  );
}
