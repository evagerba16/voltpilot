import { DashboardTopNav } from "@/components/dashboard/top-nav";
import { PageIntro, PageMain } from "@/components/dashboard/page-main";
import { CustomersView } from "@/components/customers/customers-view";
import { AlertBanner } from "@/components/ui/alert-banner";
import { getCustomers } from "@/lib/customers/queries";
import {
  CUSTOMER_SORT_FIELDS,
  type CustomerSortField,
} from "@/lib/customers/types";

type CustomersPageProps = {
  searchParams: Promise<{
    page?: string;
    q?: string;
    sort?: string;
    order?: string;
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

export default async function CustomersPage({ searchParams }: CustomersPageProps) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const search = params.q?.trim() ?? "";
  const sort = parseSortField(params.sort);
  const order = parseSortOrder(params.order);

  let data;
  let loadError: string | null = null;

  try {
    data = await getCustomers({ page, search, sort, order });
  } catch {
    loadError = "We couldn't load your customers. Refresh the page or try again in a moment.";
  }

  return (
    <>
      <DashboardTopNav title="Customers" />
      <PageMain>
        <PageIntro description="Track GCs, owners, and repeat clients—the people behind your projects and bids." />

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
          />
        )}
      </PageMain>
    </>
  );
}
