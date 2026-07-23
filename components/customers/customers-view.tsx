"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

import { CustomerFormDialog } from "@/components/customers/customer-form-dialog";
import { CustomersTable } from "@/components/customers/customers-table";
import { Button } from "@/components/ui/button";
import { FilterBar } from "@/components/ui/filter-bar";
import { ListPageHeader } from "@/components/ui/list-page-header";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { cardClassName } from "@/lib/ui/form-classes";
import { buildCustomersUrl } from "@/lib/customers/url";
import type { Customer, CustomerSortField } from "@/lib/customers/types";

type CustomersViewProps = {
  customers: Customer[];
  total: number;
  page: number;
  totalPages: number;
  search: string;
  sort: CustomerSortField;
  order: "asc" | "desc";
};

export function CustomersView({
  customers,
  total,
  page,
  totalPages,
  search,
  sort,
  order,
}: CustomersViewProps) {
  const router = useRouter();
  const { can } = usePermissions();
  const canEdit = can("customers.edit");
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const navigateSearch = useCallback(
    (query: string) => {
      router.replace(
        buildCustomersUrl({
          q: query || undefined,
          sort,
          order,
          page: 1,
        })
      );
    },
    [router, sort, order]
  );

  return (
    <>
      <div className={cardClassName}>
        <ListPageHeader
          title="Customer directory"
          description="Contacts and companies tied to your projects and bids."
          action={
            canEdit ? (
              <Button onClick={() => setAddDialogOpen(true)}>
                <Plus data-icon="inline-start" />
                Add customer
              </Button>
            ) : undefined
          }
        />

        <FilterBar
          search={search}
          searchPlaceholder="Search by company, contact, or email..."
          onSearchChange={navigateSearch}
          chips={
            search ? [{ key: "q", label: "Search", value: search }] : []
          }
          onClearChip={() => router.push(buildCustomersUrl({ sort, order, page: 1 }))}
          onClearAll={() => router.push(buildCustomersUrl({ sort, order, page: 1 }))}
        />
      </div>

      <CustomersTable
        customers={customers}
        total={total}
        page={page}
        totalPages={totalPages}
        search={search}
        sort={sort}
        order={order}
        onAddCustomer={canEdit ? () => setAddDialogOpen(true) : undefined}
      />

      {canEdit ? (
        <CustomerFormDialog
          open={addDialogOpen}
          onClose={() => setAddDialogOpen(false)}
        />
      ) : null}
    </>
  );
}
