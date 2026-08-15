"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

import { ProjectsTable } from "@/components/projects/projects-table";
import { buttonVariants } from "@/components/ui/button-variants";
import { FilterBar, FilterSelect } from "@/components/ui/filter-bar";
import { ListPageHeader } from "@/components/ui/list-page-header";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { cardClassName } from "@/lib/ui/form-classes";
import { ENTITY_PRIMARY_QUESTIONS } from "@/lib/ui/entity-page-copy";
import { buildProjectsUrl } from "@/lib/projects/url";
import type { CustomerOption } from "@/lib/projects/queries";
import type { ProjectListMetrics } from "@/lib/projects/profile-types";
import {
  PROJECT_STATUSES,
  PROJECT_TYPES,
  type ProjectArchiveFilter,
  type ProjectSortField,
  type ProjectWithCustomer,
} from "@/lib/projects/types";
import { cn } from "@/lib/utils";

type ProjectsViewProps = {
  projects: ProjectWithCustomer[];
  customers: CustomerOption[];
  listMetrics: Record<string, ProjectListMetrics>;
  total: number;
  page: number;
  totalPages: number;
  search: string;
  sort: ProjectSortField;
  order: "asc" | "desc";
  view: ProjectArchiveFilter;
  statusFilter: string;
  typeFilter: string;
  customerFilter: string;
};

const viewOptions: { value: ProjectArchiveFilter; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "archived", label: "Archived" },
  { value: "all", label: "All" },
];

export function ProjectsView({
  projects,
  customers,
  listMetrics,
  total,
  page,
  totalPages,
  search,
  sort,
  order,
  view,
  statusFilter,
  typeFilter,
  customerFilter,
}: ProjectsViewProps) {
  const router = useRouter();
  const { can } = usePermissions();
  const canEdit = can("projects.edit");
  const [instantSearch, setInstantSearch] = useState(search);

  useEffect(() => {
    setInstantSearch(search);
  }, [search]);

  const selectedCustomer = customers.find((customer) => customer.id === customerFilter);

  const navigate = useCallback(
    (params: {
      q?: string;
      status?: string;
      type?: string;
      customer?: string;
      view?: ProjectArchiveFilter;
    }) => {
      router.replace(
        buildProjectsUrl({
          q: params.q ?? search,
          status: params.status ?? statusFilter,
          type: params.type ?? typeFilter,
          customer: params.customer ?? customerFilter,
          view: params.view ?? view,
          sort,
          order,
          page: 1,
        })
      );
    },
    [router, search, statusFilter, typeFilter, customerFilter, view, sort, order]
  );

  const handleSearchChange = useCallback(
    (query: string) => navigate({ q: query }),
    [navigate]
  );

  const handleSearchInputChange = useCallback((query: string) => {
    setInstantSearch(query);
  }, []);

  const chips = [
    statusFilter ? { key: "status", label: "Status", value: statusFilter } : null,
    typeFilter ? { key: "type", label: "Type", value: typeFilter } : null,
    customerFilter && selectedCustomer
      ? { key: "customer", label: "Customer", value: selectedCustomer.company_name }
      : null,
    view !== "active"
      ? {
          key: "view",
          label: "View",
          value: view === "archived" ? "Archived" : "All projects",
        }
      : null,
  ].filter(Boolean) as Array<{ key: string; label: string; value: string }>;

  return (
    <>
      <div className={cardClassName}>
        <ListPageHeader
          title="Projects"
          description={ENTITY_PRIMARY_QUESTIONS.project}
          action={
            canEdit ? (
              <Link href="/projects/new" className={buttonVariants()}>
                <Plus data-icon="inline-start" />
                Add project
              </Link>
            ) : undefined
          }
        />

        <FilterBar
          search={instantSearch}
          searchPlaceholder="Search by project, customer, GC, or estimator..."
          onSearchChange={handleSearchChange}
          onSearchInputChange={handleSearchInputChange}
          debounceMs={300}
          chips={chips}
          onClearChip={(key) => {
            if (key === "status") navigate({ status: "" });
            if (key === "type") navigate({ type: "" });
            if (key === "customer") navigate({ customer: "" });
            if (key === "view") navigate({ view: "active" });
          }}
          onClearAll={() =>
            router.push(buildProjectsUrl({ sort, order, view: "active", page: 1 }))
          }
          filters={
            <>
              <FilterSelect
                label="Filter by status"
                value={statusFilter}
                onChange={(value) => navigate({ status: value })}
              >
                <option value="">All statuses</option>
                {PROJECT_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </FilterSelect>

              <FilterSelect
                label="Filter by type"
                value={typeFilter}
                onChange={(value) => navigate({ type: value })}
              >
                <option value="">All types</option>
                {PROJECT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </FilterSelect>

              <FilterSelect
                label="Filter by customer"
                value={customerFilter}
                onChange={(value) => navigate({ customer: value })}
              >
                <option value="">All customers</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.company_name}
                  </option>
                ))}
              </FilterSelect>

              <div className="flex rounded-lg border border-border p-0.5">
                {viewOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => navigate({ view: option.value })}
                    className={cn(
                      "rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                      view === option.value
                        ? "bg-muted text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </>
          }
        />
      </div>

      <ProjectsTable
        projects={projects}
        listMetrics={listMetrics}
        total={total}
        page={page}
        totalPages={totalPages}
        search={search}
        sort={sort}
        order={order}
        view={view}
        statusFilter={statusFilter}
        typeFilter={typeFilter}
        customerFilter={customerFilter}
      />
    </>
  );
}
