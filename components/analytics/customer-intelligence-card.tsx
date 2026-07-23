"use client";

import Link from "next/link";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Clock3, Crown, Sparkles, Users } from "lucide-react";

import { ForecastMetric } from "@/components/analytics/forecast-metric";
import type { CustomerIntelligenceResult } from "@/lib/analytics/analytics-service";
import { formatCurrency, formatPercent } from "@/lib/analytics/format";

type CustomerIntelligenceCardProps = {
  intelligence: CustomerIntelligenceResult;
};

function CurrencyTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-sm shadow-md">
      <p className="font-medium">{label}</p>
      <p className="text-muted-foreground">{formatCurrency(payload[0].value)}</p>
    </div>
  );
}

export function CustomerIntelligenceCard({
  intelligence,
}: CustomerIntelligenceCardProps) {
  const chartData = intelligence.topCustomersByRevenue.map((customer) => ({
    label:
      customer.companyName.length > 18
        ? `${customer.companyName.slice(0, 18)}…`
        : customer.companyName,
    revenue: customer.revenue,
  }));

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      <div className="flex flex-col gap-3 border-b border-border px-6 py-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Sparkles className="size-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold">Customer Intelligence</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Revenue concentration, repeat business, and customer value patterns.
            </p>
          </div>
        </div>
        {intelligence.source === "rules" ? (
          <span className="rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-700 dark:text-amber-400">
            Standard recommendations
          </span>
        ) : null}
      </div>

      <div className="grid gap-3 p-6 sm:grid-cols-2 xl:grid-cols-4">
        <ForecastMetric
          label="Repeat customers"
          value={formatPercent(intelligence.repeatCustomerPercent)}
          hint={`${intelligence.repeatCustomerCount} of ${intelligence.activeCustomerCount} active customers`}
          tone="positive"
        />
        <ForecastMetric
          label="Avg project value"
          value={formatCurrency(intelligence.averageProjectValuePerCustomer)}
          hint="Average project value per customer"
        />
        <ForecastMetric
          label="Largest customer"
          value={
            intelligence.largestCustomer
              ? formatCurrency(intelligence.largestCustomer.revenue)
              : "—"
          }
          hint={
            intelligence.largestCustomer
              ? intelligence.largestCustomer.companyName
              : "No customer revenue in this period"
          }
        />
        <ForecastMetric
          label="Top customer share"
          value={
            intelligence.largestCustomer
              ? formatPercent(intelligence.largestCustomer.revenueSharePercent)
              : "—"
          }
          hint="Largest customer share of total revenue"
        />
      </div>

      <div className="grid gap-6 border-t border-border px-6 py-6 xl:grid-cols-2">
        <div>
          <div className="mb-4">
            <h3 className="text-sm font-semibold">Top 10 customers by revenue</h3>
            <p className="text-sm text-muted-foreground">
              Highest revenue contributors in the selected period.
            </p>
          </div>
          {chartData.length > 0 ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" margin={{ left: 12 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis
                    type="category"
                    dataKey="label"
                    width={96}
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip content={<CurrencyTooltip />} />
                  <Bar dataKey="revenue" fill="#10b981" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No customer revenue found for the current filters.
            </p>
          )}
        </div>

        <div className="rounded-lg border border-border">
          <div className="border-b border-border px-4 py-3">
            <h3 className="text-sm font-semibold">Customer ranking</h3>
            <p className="text-xs text-muted-foreground">
              Revenue, projects, and average project value.
            </p>
          </div>
          {intelligence.topCustomersByRevenue.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              No ranked customers for the current filters.
            </p>
          ) : (
            <div className="divide-y divide-border/60">
              {intelligence.topCustomersByRevenue.map((customer, index) => (
                <Link
                  key={customer.customerId}
                  href={customer.href}
                  className="flex items-center justify-between gap-3 px-4 py-3 text-sm transition-colors hover:bg-muted/30"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                        {index + 1}
                      </span>
                      <p className="truncate font-medium">{customer.companyName}</p>
                      {index === 0 ? (
                        <Crown className="size-3.5 shrink-0 text-amber-500" />
                      ) : null}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {customer.projectCount} project
                      {customer.projectCount === 1 ? "" : "s"} ·{" "}
                      {formatCurrency(customer.averageProjectValue)} avg project
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-medium tabular-nums">
                      {formatCurrency(customer.revenue)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatPercent(customer.revenueSharePercent)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-border px-6 py-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold">Fastest paying customers</h3>
            <p className="text-sm text-muted-foreground">
              Ranked by average days from invoice to payment when payment data is
              connected.
            </p>
          </div>
          {!intelligence.paymentTrackingEnabled ? (
            <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
              Future-ready
            </span>
          ) : null}
        </div>

        {intelligence.paymentTrackingEnabled ? (
          <div className="divide-y divide-border/60 rounded-lg border border-border">
            {intelligence.fastestPayingCustomers.map((customer) => (
              <Link
                key={customer.customerId}
                href={customer.href}
                className="flex items-center justify-between gap-3 px-4 py-3 text-sm transition-colors hover:bg-muted/30"
              >
                <div>
                  <p className="font-medium">{customer.companyName}</p>
                  <p className="text-xs text-muted-foreground">
                    {customer.paymentEventCount} payment
                    {customer.paymentEventCount === 1 ? "" : "s"} tracked
                  </p>
                </div>
                <span className="font-medium tabular-nums">
                  {customer.averageDaysToPay.toFixed(1)} days
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-8 text-center">
            <Clock3 className="mx-auto size-8 text-muted-foreground" />
            <p className="mt-3 text-sm font-medium">Payment tracking not connected</p>
            <p className="mt-1 text-sm text-muted-foreground">
              This section will rank customers by payment speed once invoice and
              payment events are available.
            </p>
          </div>
        )}
      </div>

      <div className="border-t border-border px-6 py-4">
        <p className="flex items-start gap-1.5 text-sm text-muted-foreground">
          <Users className="mt-0.5 size-4 shrink-0" />
          {intelligence.methodology}
        </p>
      </div>
    </div>
  );
}
