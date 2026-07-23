import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import { formatCurrency, formatPercent } from "@/lib/analytics/format";
import type { AnalyticsData } from "@/lib/analytics/types";

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#111827",
    lineHeight: 1.4,
  },
  header: {
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    paddingBottom: 12,
  },
  title: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 10,
    color: "#6b7280",
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    marginTop: 16,
    marginBottom: 8,
    color: "#1d4ed8",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
    paddingVertical: 6,
  },
  label: {
    color: "#374151",
  },
  value: {
    fontFamily: "Helvetica-Bold",
  },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    paddingTop: 8,
    fontSize: 8,
    color: "#6b7280",
    flexDirection: "row",
    justifyContent: "space-between",
  },
});

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

type AnalyticsPdfDocumentProps = {
  data: AnalyticsData;
};

export function AnalyticsPdfDocument({ data }: AnalyticsPdfDocumentProps) {
  const generated = new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(data.generatedAt));

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>VoltPilot Analytics Report</Text>
          <Text style={styles.subtitle}>
            {data.filters.dateRange.toUpperCase()} · Generated {generated}
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Executive KPIs</Text>
        <MetricRow label="Revenue" value={formatCurrency(data.executive.revenue)} />
        <MetricRow label="Gross Profit" value={formatCurrency(data.executive.grossProfit)} />
        <MetricRow
          label="Gross Margin"
          value={formatPercent(data.executive.grossMarginPercent)}
        />
        <MetricRow label="Total Estimates" value={String(data.executive.totalEstimates)} />
        <MetricRow label="Total Proposals" value={String(data.executive.totalProposals)} />
        <MetricRow label="Win Rate" value={formatPercent(data.executive.winRate)} />
        <MetricRow label="Active Projects" value={String(data.executive.activeProjects)} />
        <MetricRow
          label="Pipeline Value"
          value={formatCurrency(data.executive.pipelineValue)}
        />

        <Text style={styles.sectionTitle}>Estimating</Text>
        <MetricRow
          label="Estimate Accuracy"
          value={formatPercent(data.estimating.estimateAccuracyPercent)}
        />
        <MetricRow
          label="Estimated vs Actual Variance"
          value={formatPercent(data.estimating.costVariancePercent)}
        />
        <MetricRow
          label="Labor Utilization"
          value={formatPercent(data.estimating.laborUtilizationPercent)}
        />
        <MetricRow label="Change Orders" value={String(data.estimating.changeOrderCount)} />
        <MetricRow label="Cost Overruns" value={String(data.estimating.costOverrunCount)} />

        <Text style={styles.sectionTitle}>Proposals</Text>
        <MetricRow
          label="Acceptance Rate"
          value={formatPercent(data.proposals.acceptanceRate)}
        />
        <MetricRow label="Decline Rate" value={formatPercent(data.proposals.declineRate)} />
        <MetricRow label="Revenue Won" value={formatCurrency(data.proposals.revenueWon)} />
        <MetricRow label="Revenue Lost" value={formatCurrency(data.proposals.revenueLost)} />

        <Text style={styles.sectionTitle}>Customers</Text>
        <MetricRow
          label="Repeat Customer Rate"
          value={formatPercent(data.customers.repeatCustomerRate)}
        />
        <MetricRow
          label="Average Customer Value"
          value={formatCurrency(data.customers.averageCustomerValue)}
        />
        <MetricRow
          label="Customer Lifetime Value"
          value={formatCurrency(data.customers.customerLifetimeValue)}
        />

        <Text style={styles.sectionTitle}>AI Performance</Text>
        <MetricRow
          label="AI-Assisted Estimates"
          value={String(data.ai.aiGeneratedEstimates)}
        />
        <MetricRow label="AI Adoption Rate" value={formatPercent(data.ai.aiAdoptionRate)} />
        <MetricRow
          label="Time Saved (hours)"
          value={data.ai.estimatedTimeSavedHours.toFixed(1)}
        />
        <MetricRow
          label="Recommendation Acceptance"
          value={formatPercent(data.ai.recommendationAcceptanceRate)}
        />

        <View style={styles.footer} fixed>
          <Text>VoltPilot · Residential & Commercial Electrical Analytics</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
