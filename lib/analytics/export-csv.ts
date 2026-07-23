import type { AnalyticsData } from "@/lib/analytics/types";
import { formatCurrency, formatPercent } from "@/lib/analytics/format";

function escapeCsv(value: string | number) {
  const text = String(value);
  if (text.includes(",") || text.includes('"') || text.includes("\n")) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function row(cells: Array<string | number>) {
  return cells.map(escapeCsv).join(",");
}

export function analyticsToCsv(data: AnalyticsData) {
  const lines: string[] = [];

  lines.push("VoltPilot Analytics Export");
  lines.push(`Generated,${data.generatedAt}`);
  lines.push(`Date Range,${data.filters.dateRange}`);
  lines.push("");

  lines.push("Executive KPIs");
  lines.push(row(["Metric", "Value"]));
  lines.push(row(["Revenue", formatCurrency(data.executive.revenue)]));
  lines.push(row(["Gross Profit", formatCurrency(data.executive.grossProfit)]));
  lines.push(row(["Gross Margin %", formatPercent(data.executive.grossMarginPercent)]));
  lines.push(row(["Total Estimates", data.executive.totalEstimates]));
  lines.push(row(["Total Proposals", data.executive.totalProposals]));
  lines.push(row(["Win Rate", formatPercent(data.executive.winRate)]));
  lines.push(row(["Active Projects", data.executive.activeProjects]));
  lines.push(row(["Pipeline Value", formatCurrency(data.executive.pipelineValue)]));
  lines.push(row(["Average Estimate Size", formatCurrency(data.executive.averageEstimateSize)]));
  lines.push(row(["Average Project Margin", formatPercent(data.executive.averageProjectMargin)]));
  lines.push(
    row([
      "Average Estimate Production (hrs)",
      data.executive.averageEstimateProductionHours.toFixed(1),
    ])
  );
  lines.push(
    row([
      "Average Proposal Acceptance (days)",
      data.executive.averageProposalAcceptanceDays.toFixed(1),
    ])
  );
  lines.push("");

  lines.push("Estimating Analytics");
  lines.push(row(["Metric", "Value"]));
  lines.push(row(["Estimate Accuracy %", formatPercent(data.estimating.estimateAccuracyPercent)]));
  lines.push(row(["Estimated Total", formatCurrency(data.estimating.estimatedTotal)]));
  lines.push(row(["Actual Total", formatCurrency(data.estimating.actualTotal)]));
  lines.push(row(["Cost Variance %", formatPercent(data.estimating.costVariancePercent)]));
  lines.push(row(["Labor Utilization %", formatPercent(data.estimating.laborUtilizationPercent)]));
  lines.push(row(["Change Orders", data.estimating.changeOrderCount]));
  lines.push(row(["Cost Overruns", data.estimating.costOverrunCount]));
  lines.push("");

  lines.push("Margin by Project");
  lines.push(row(["Project", "Customer", "Margin %", "Revenue"]));
  for (const project of data.estimating.marginByProject) {
    lines.push(
      row([
        project.projectName,
        project.customerName,
        formatPercent(project.marginPercent),
        formatCurrency(project.revenue),
      ])
    );
  }
  lines.push("");

  lines.push("Proposal Analytics");
  lines.push(row(["Metric", "Value"]));
  lines.push(row(["Acceptance Rate", formatPercent(data.proposals.acceptanceRate)]));
  lines.push(row(["Decline Rate", formatPercent(data.proposals.declineRate)]));
  lines.push(
    row(["Average Sales Cycle (days)", data.proposals.averageSalesCycleDays.toFixed(1)])
  );
  lines.push(row(["Average Proposal Value", formatCurrency(data.proposals.averageProposalValue)]));
  lines.push(row(["Revenue Won", formatCurrency(data.proposals.revenueWon)]));
  lines.push(row(["Revenue Lost", formatCurrency(data.proposals.revenueLost)]));
  lines.push("");

  lines.push("Top Customers");
  lines.push(row(["Customer", "Revenue", "Projects", "Estimates"]));
  for (const customer of data.customers.topCustomers) {
    lines.push(
      row([
        customer.companyName,
        formatCurrency(customer.revenue),
        customer.projectCount,
        customer.estimateCount,
      ])
    );
  }
  lines.push("");

  lines.push("Revenue by Project");
  lines.push(row(["Project", "Customer", "Status", "Revenue"]));
  for (const project of data.projects.revenueByProject) {
    lines.push(
      row([
        project.projectName,
        project.customerName,
        project.status,
        formatCurrency(project.revenue),
      ])
    );
  }
  lines.push("");

  lines.push("AI Analytics");
  lines.push(row(["Metric", "Value"]));
  lines.push(row(["AI-Assisted Estimates", data.ai.aiGeneratedEstimates]));
  lines.push(row(["AI Adoption Rate", formatPercent(data.ai.aiAdoptionRate)]));
  lines.push(row(["Estimated Time Saved (hrs)", data.ai.estimatedTimeSavedHours.toFixed(1)]));
  lines.push(
    row([
      "Recommendation Acceptance Rate",
      formatPercent(data.ai.recommendationAcceptanceRate),
    ])
  );
  lines.push(
    row([
      "Average Estimate Completion (hrs)",
      data.ai.averageEstimateCompletionHours.toFixed(1),
    ])
  );

  return `${lines.join("\n")}\n`;
}
