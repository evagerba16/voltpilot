"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

import { CustomerFormDialog } from "@/components/customers/customer-form-dialog";
import { CustomersTable } from "@/components/customers/customers-table";
import { Button } from "@/components/ui/button";
import { FilterBar, FilterSelect } from "@/components/ui/filter-bar";
import { ListPageHeader } from "@/components/ui/list-page-header";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { cardClassName } from "@/lib/ui/form-classes";
import { ENTITY_PRIMARY_QUESTIONS } from "@/lib/ui/entity-page-copy";
import { buildCustomersUrl } from "@/lib/customers/url";
import {
  CUSTOMER_NOTES_FILTERS,
  CUSTOMER_PROJECT_FILTERS,
  CUSTOMER_STATUS_FILTERS,
  type CustomerListItem,
  type CustomerNotesFilter,
  type CustomerProjectFilter,
  type CustomerSortField,
  type CustomerStatusFilter,
} from "@/lib/customers/types";

type CustomersViewProps = {
  customers: CustomerListItem[];
  total: number;
  page: number;
  totalPages: number;
  search: string;
  sort: CustomerSortField;
  order: "asc" | "desc";
  projectFilter: CustomerProjectFilter;
  notesFilter: CustomerNotesFilter;
  statusFilter: CustomerStatusFilter;
  openAddDialog?: boolean;
};

export function CustomersView({
  customers,
  total,
  page,
  totalPages,
  search,
  sort,
  order,
  projectFilter,
  notesFilter,
  statusFilter,
  openAddDialog = false,
}: CustomersViewProps) {
  const router = useRouter();
  const { can } = usePermissions();
  const canEdit = can("customers.edit");
  const [addDialogOpen, setAddDialogOpen] = useState(openAddDialog);
  const [instantSearch, setInstantSearch] = useState(search);

  useEffect(() => {
    setInstantSearch(search);
  }, [search]);

  useEffect(() => {
    if (openAddDialog && canEdit) {
      setAddDialogOpen(true);
    }
  }, [openAddDialog, canEdit]);

  function handleCloseAddDialog() {
    setAddDialogOpen(false);

    if (openAddDialog) {
      router.replace(
        buildCustomersUrl({
          q: search,
          projects: projectFilter,
          notes: notesFilter,
          status: statusFilter,
          sort,
          order,
          page,
        }),
        { scroll: false }
      );
    }
  }

  const navigate = useCallback(
    (params: {
      q?: string;
      projects?: CustomerProjectFilter;
      notes?: CustomerNotesFilter;
      status?: CustomerStatusFilter;
    }) => {
      router.replace(
        buildCustomersUrl({
          q: params.q ?? search,
          projects: params.projects ?? projectFilter,
          notes: params.notes ?? notesFilter,
          status: params.status ?? statusFilter,
          sort,
          order,
          page: 1,
        })
      );
    },
    [router, search, projectFilter, notesFilter, statusFilter, sort, order]
  );

  const chips = [
    statusFilter !== "all"
      ? {
          key: "status",
          label: "Status",
          value:
            CUSTOMER_STATUS_FILTERS.find((option) => option.value === statusFilter)
              ?.label ?? statusFilter,
        }
      : null,
    projectFilter !== "all"
      ? {
          key: "projects",
          label: "Projects",
          value:
            CUSTOMER_PROJECT_FILTERS.find((option) => option.value === projectFilter)
              ?.label ?? projectFilter,
        }
      : null,
    notesFilter !== "all"
      ? {
          key: "notes",
          label: "Notes",
          value:
            CUSTOMER_NOTES_FILTERS.find((option) => option.value === notesFilter)
              ?.label ?? notesFilter,
        }
      : null,
    search ? { key: "q", label: "Search", value: search } : null,
  ].filter(Boolean) as Array<{ key: string; label: string; value: string }>;

  return (
    <>
      <div className={cardClassName}>
        <ListPageHeader
          title="Customers"
          description={ENTITY_PRIMARY_QUESTIONS.customer}
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
          searchPlaceholder="Search company, contact, email, phone, or address..."
          debounceMs={120}
          onSearchChange={(query) => navigate({ q: query })}
          onSearchInputChange={setInstantSearch}
          filters={
            <>
              <FilterSelect
                label="Filter by status"
                value={statusFilter}
                onChange={(value) =>
                  navigate({ status: value as CustomerStatusFilter })
                }
              >
                {CUSTOMER_STATUS_FILTERS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </FilterSelect>

              <FilterSelect
                label="Filter by projects"
                value={projectFilter}
                onChange={(value) =>
                  navigate({ projects: value as CustomerProjectFilter })
                }
              >
                {CUSTOMER_PROJECT_FILTERS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </FilterSelect>

              <FilterSelect
                label="Filter by notes"
                value={notesFilter}
                onChange={(value) =>
                  navigate({ notes: value as CustomerNotesFilter })
                }
              >
                {CUSTOMER_NOTES_FILTERS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </FilterSelect>
            </>
          }
          chips={chips}
          onClearChip={(key) => {
            if (key === "q") navigate({ q: "" });
            if (key === "status") navigate({ status: "all" });
            if (key === "projects") navigate({ projects: "all" });
            if (key === "notes") navigate({ notes: "all" });
          }}
          onClearAll={() =>
            router.push(buildCustomersUrl({ sort, order, page: 1 }))
          }
        />
      </div>

      <CustomersTable
        customers={customers}
        total={total}
        page={page}
        totalPages={totalPages}
        search={search}
        instantSearch={instantSearch}
        sort={sort}
        order={order}
        projectFilter={projectFilter}
        notesFilter={notesFilter}
        statusFilter={statusFilter}
        onAddCustomer={canEdit ? () => setAddDialogOpen(true) : undefined}
      />

      {canEdit ? (
        <CustomerFormDialog
          open={addDialogOpen}
          onClose={handleCloseAddDialog}
        />
      ) : null}
    </>
  );
}
