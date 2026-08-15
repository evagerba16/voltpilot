import { notFound } from "next/navigation";

import { DashboardTopNav } from "@/components/dashboard/top-nav";
import { PageMain } from "@/components/dashboard/page-main";
import { CustomerDetail } from "@/components/customers/customer-detail";
import { AlertBanner } from "@/components/ui/alert-banner";
import { assertPermission } from "@/lib/auth/get-team-context";
import { isPermissionDenied } from "@/lib/auth/permission-errors";
import { getCustomerProfile } from "@/lib/customers/queries";
import {
  CUSTOMER_DETAIL_TABS,
  parseEntityTab,
  type CustomerDetailTabId,
} from "@/lib/ui/entity-tab-ids";

type CustomerDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
};

export default async function CustomerDetailPage({
  params,
  searchParams,
}: CustomerDetailPageProps) {
  try {
    await assertPermission("customers.view");
  } catch (error) {
    if (isPermissionDenied(error)) {
      return (
        <>
          <DashboardTopNav title="Customer" />
          <PageMain>
            <AlertBanner variant="error" title="Access denied">
              You do not have permission to view customers.
            </AlertBanner>
          </PageMain>
        </>
      );
    }

    throw error;
  }

  const { id } = await params;
  const query = await searchParams;
  const initialTab = parseEntityTab<CustomerDetailTabId>(
    query.tab,
    CUSTOMER_DETAIL_TABS,
    "overview"
  );
  let profile;

  try {
    profile = await getCustomerProfile(id);
  } catch {
    return (
      <>
        <DashboardTopNav title="Customer" />
        <PageMain>
          <AlertBanner variant="error" title="Unable to load customer">
            We couldn&apos;t load this customer profile. Refresh the page or try again in a
            moment.
          </AlertBanner>
        </PageMain>
      </>
    );
  }

  if (!profile) {
    notFound();
  }

  return (
    <>
      <DashboardTopNav title={profile.customer.company_name} />
      <PageMain>
        <CustomerDetail profile={profile} initialTab={initialTab} />
      </PageMain>
    </>
  );
}
