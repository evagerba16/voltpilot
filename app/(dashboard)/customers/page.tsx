import { DashboardTopNav } from "@/components/dashboard/top-nav";
import { PageMain } from "@/components/dashboard/page-main";
import { CustomersView } from "@/components/customers/customers-view";
import { AlertBanner } from "@/components/ui/alert-banner";
import { getCustomers } from "@/lib/customers/queries";
import {
  CUSTOMER_NOTES_FILTERS,
  CUSTOMER_PROJECT_FILTERS,
  CUSTOMER_SORT_FIELDS,
  CUSTOMER_STATUS_FILTERS,
  type CustomerNotesFilter,
  type CustomerProjectFilter,
  type CustomerSortField,
  type CustomerStatusFilter,
} from "@/lib/customers/types";

type CustomersPageProps = {
  searchParams: Promise<{
    page?: string;
    q?: string;
    sort?: string;
    order?: string;
    projects?: string;
    notes?: string;
    status?: string;
    action?: string;
  }>;
};

function parseSortField(value: string | undefined): CustomerSortField {
  if (value && CUSTOMER_SORT_FIELDS.includes(value as CustomerSortField)) {
    return value as CustomerSortField;
  }

  return "company_name";
}

function parseSortOrder(value: string | undefined): "asc" | "desc" {
  return value === "desc" ? "desc" : "asc";
}

function parseProjectFilter(value: string | undefined): CustomerProjectFilter {
  if (
    value &&
    CUSTOMER_PROJECT_FILTERS.some((option) => option.value === value)
  ) {
    return value as CustomerProjectFilter;
  }

  return "all";
}

function parseNotesFilter(value: string | undefined): CustomerNotesFilter {
  if (value && CUSTOMER_NOTES_FILTERS.some((option) => option.value === value)) {
    return value as CustomerNotesFilter;
  }

  return "all";
}

function parseStatusFilter(value: string | undefined): CustomerStatusFilter {
  if (value && CUSTOMER_STATUS_FILTERS.some((option) => option.value === value)) {
    return value as CustomerStatusFilter;
  }

  return "all";
}

export default async function CustomersPage({ searchParams }: CustomersPageProps) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const search = params.q?.trim() ?? "";
  const sort = parseSortField(params.sort);
  const order = parseSortOrder(params.order);
  const projectFilter = parseProjectFilter(params.projects);
  const notesFilter = parseNotesFilter(params.notes);
  const statusFilter = parseStatusFilter(params.status);
  const openAddDialog = params.action === "add";

  let data;
  let loadError: string | null = null;

  try {
    data = await getCustomers({
      page,
      search,
      sort,
      order,
      projects: projectFilter,
      notes: notesFilter,
      status: statusFilter,
    });
  } catch {
    loadError = "We couldn't load your customers. Refresh the page or try again in a moment.";
  }

  return (
    <>
      <DashboardTopNav title="Customers" />
      <PageMain>
        {loadError ? (
          <AlertBanner variant="error" title="Unable to load customers">
            {loadError}
          </AlertBanner>
        ) : (
          <CustomersView
            customers={data!.customers}
            total={data!.total}
            page={data!.page}
            totalPages={data!.totalPages}
            search={search}
            sort={sort}
            order={order}
            projectFilter={projectFilter}
            notesFilter={notesFilter}
            statusFilter={statusFilter}
            openAddDialog={openAddDialog}
          />
        )}
      </PageMain>
    </>
  );
}
