import { average, safePercent } from "@/lib/analytics/time-buckets";
import type {
  CustomerIntelligenceInput,
  CustomerIntelligenceRecord,
} from "@/lib/analytics/types";

export type CustomerIntelligenceSource = "rules" | "openai";

export type CustomerRevenueRank = {
  customerId: string;
  companyName: string;
  revenue: number;
  projectCount: number;
  estimateCount: number;
  averageProjectValue: number;
  revenueSharePercent: number;
  href: string;
};

export type FastestPayingCustomer = {
  customerId: string;
  companyName: string;
  averageDaysToPay: number;
  paymentEventCount: number;
  href: string;
};

export type CustomerIntelligenceResult = {
  topCustomersByRevenue: CustomerRevenueRank[];
  repeatCustomerPercent: number;
  averageProjectValuePerCustomer: number;
  largestCustomer: CustomerRevenueRank | null;
  fastestPayingCustomers: FastestPayingCustomer[];
  paymentTrackingEnabled: boolean;
  activeCustomerCount: number;
  repeatCustomerCount: number;
  generatedAt: string;
  source: CustomerIntelligenceSource;
  methodology: string;
};

const TOP_CUSTOMER_LIMIT = 10;

function buildCustomerRank(
  customer: CustomerIntelligenceRecord,
  totalRevenue: number
): CustomerRevenueRank {
  return {
    customerId: customer.customerId,
    companyName: customer.companyName,
    revenue: customer.revenue,
    projectCount: customer.projectCount,
    estimateCount: customer.estimateCount,
    averageProjectValue:
      customer.projectCount > 0
        ? customer.projectValueTotal / customer.projectCount
        : 0,
    revenueSharePercent: safePercent(customer.revenue, totalRevenue),
    href: `/analytics?section=customers&customer=${customer.customerId}`,
  };
}

function buildRepeatCustomerPercent(customers: CustomerIntelligenceRecord[]) {
  const activeCustomers = customers.filter(
    (customer) =>
      customer.revenue > 0 || customer.projectCount > 0 || customer.estimateCount > 0
  );

  if (activeCustomers.length === 0) {
    return 0;
  }

  const repeatCustomers = activeCustomers.filter(
    (customer) => customer.projectCount > 1
  ).length;

  return safePercent(repeatCustomers, activeCustomers.length);
}

function buildAverageProjectValuePerCustomer(
  customers: CustomerIntelligenceRecord[]
) {
  const samples = customers
    .filter((customer) => customer.projectCount > 0)
    .map((customer) => customer.projectValueTotal / customer.projectCount);

  return average(samples);
}

function buildFastestPayingCustomers(customers: CustomerIntelligenceRecord[]) {
  return customers
    .filter(
      (customer) =>
        customer.averageDaysToPay !== null &&
        customer.averageDaysToPay > 0 &&
        customer.paymentEventCount > 0
    )
    .sort((a, b) => (a.averageDaysToPay ?? 0) - (b.averageDaysToPay ?? 0))
    .slice(0, TOP_CUSTOMER_LIMIT)
    .map((customer) => ({
      customerId: customer.customerId,
      companyName: customer.companyName,
      averageDaysToPay: customer.averageDaysToPay!,
      paymentEventCount: customer.paymentEventCount,
      href: `/analytics?section=customers&customer=${customer.customerId}`,
    }));
}

/**
 * Rule-based customer intelligence from revenue, projects, and payment placeholders.
 * Swap the implementation to call OpenAI later without changing consumers.
 */
export function generateCustomerIntelligence(
  input: CustomerIntelligenceInput,
  generatedAt: string,
  source: CustomerIntelligenceSource = "rules"
): CustomerIntelligenceResult {
  const sortedCustomers = [...input.customers].sort((a, b) => b.revenue - a.revenue);
  const totalRevenue = sortedCustomers.reduce(
    (sum, customer) => sum + customer.revenue,
    0
  );

  const rankedCustomers = sortedCustomers.map((customer) =>
    buildCustomerRank(customer, totalRevenue)
  );

  const topCustomersByRevenue = rankedCustomers.slice(0, TOP_CUSTOMER_LIMIT);
  const fastestPayingCustomers = buildFastestPayingCustomers(input.customers);
  const repeatCustomerCount = input.customers.filter(
    (customer) => customer.projectCount > 1
  ).length;

  return {
    topCustomersByRevenue,
    repeatCustomerPercent: buildRepeatCustomerPercent(input.customers),
    averageProjectValuePerCustomer: buildAverageProjectValuePerCustomer(
      input.customers
    ),
    largestCustomer: rankedCustomers[0] ?? null,
    fastestPayingCustomers,
    paymentTrackingEnabled: fastestPayingCustomers.length > 0,
    activeCustomerCount: input.activeCustomerCount,
    repeatCustomerCount,
    generatedAt,
    source,
    methodology:
      "Rankings use accepted proposal revenue, estimate value, and project totals. Payment speed activates when invoice payment data is available.",
  };
}

/** Future OpenAI upgrade path — same signature, different implementation. */
export async function generateCustomerIntelligenceAsync(
  input: CustomerIntelligenceInput,
  generatedAt: string
): Promise<CustomerIntelligenceResult> {
  return generateCustomerIntelligence(input, generatedAt, "rules");
}
