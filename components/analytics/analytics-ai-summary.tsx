"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Sparkles,
  Target,
  TrendingUp,
  Zap,
} from "lucide-react";

import { AnalyticsEmptyState } from "@/components/analytics/analytics-empty-state";
import type { AnalyticsViewModel } from "@/lib/analytics/analytics-service";
import type { AiInsightsViewModel } from "@/lib/analytics/ai-insights-service";
import { formatCurrency, formatPercent } from "@/lib/analytics/format";
import type { AnalyticsData } from "@/lib/analytics/types";
import { isAnalyticsPortfolioEmpty } from "@/lib/analytics/chart-helpers";
import { cn } from "@/lib/utils";

type AnalyticsAiSummaryProps = {
  data: AnalyticsData;
  analytics: AnalyticsViewModel;
  aiInsights: AiInsightsViewModel;
};

type InsightCard = {
  id: string;
  title: string;
  summary: string;
  detail: string;
  href?: string;
  actionLabel?: string;
  tone: "success" | "warning" | "info";
};

const toneStyles = {
  success: {
    icon: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    badge: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  },
  warning: {
    icon: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    badge: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  },
  info: {
    icon: "bg-primary/10 text-primary",
    badge: "bg-muted text-muted-foreground",
  },
} as const;

function buildInsightCards({
  data,
  analytics,
  aiInsights,
}: AnalyticsAiSummaryProps): InsightCard[] {
  const topProject = [...data.estimating.marginByProject].sort(
    (left, right) => right.marginPercent - left.marginPercent
  )[0];

  const marginCoach = aiInsights.businessCoach.insights.find(
    (insight) =>
      insight.category === "low_margin_estimates" ||
      insight.category === "project_review"
  );

  const marginOpportunity = aiInsights.opportunities.opportunities.find(
    (item) => item.category === "margin_review" || item.category === "markup"
  );

  const riskyInsight =
    aiInsights.businessCoach.insights.find(
      (insight) => insight.category === "low_margin_estimates"
    ) ??
    aiInsights.opportunities.opportunities.find(
      (item) =>
        item.category === "margin_review" && item.severity === "high"
    );

  const conversionInsight =
    aiInsights.businessCoach.insights.find(
      (insight) => insight.category === "proposal_follow_up"
    ) ??
    aiInsights.opportunities.opportunities.find(
      (item) => item.category === "proposal_follow_up"
    );

  const followUpCount =
    analytics.proposalIntelligence.openFollowUpCount;

  return [
    {
      id: "profitable-projects",
      title: "Most profitable project types",
      summary: topProject
        ? `${topProject.projectName} leads at ${formatPercent(topProject.marginPercent)} margin`
        : "Add finalized estimates to rank project profitability",
      detail: topProject
        ? `${topProject.customerName} · ${formatCurrency(topProject.revenue)} revenue`
        : "Margin by project updates as you finalize more estimates.",
      href: topProject ? `/projects/${topProject.projectId}` : "/projects",
      actionLabel: topProject ? "View project" : "Add project",
      tone: "success",
    },
    {
      id: "margin-improvements",
      title: "Margin improvements",
      summary:
        marginCoach?.title ??
        marginOpportunity?.title ??
        (data.executive.grossMarginPercent >= 15
          ? "Margins are healthy for the selected period"
          : "Review markup and labor rates on low-margin work"),
      detail:
        marginCoach?.recommendedAction ??
        marginOpportunity?.recommendedAction ??
        `Current average gross margin is ${formatPercent(data.executive.grossMarginPercent)}.`,
      href: marginCoach?.href ?? marginOpportunity?.href ?? "/estimates",
      actionLabel: "Review estimates",
      tone:
        data.executive.grossMarginPercent >= 15
          ? "success"
          : marginCoach || marginOpportunity
            ? "warning"
            : "info",
    },
    {
      id: "risky-estimates",
      title: "Risky estimates",
      summary:
        riskyInsight?.title ??
        (data.estimating.marginByProject.some(
          (project) => project.marginPercent < 15
        )
          ? "Some projects are below target margin"
          : "No high-risk margin issues flagged"),
      detail:
        riskyInsight?.explanation ??
        riskyInsight?.recommendedAction ??
        "VoltPilot flags estimates with thin margins so you can adjust before sending proposals.",
      href: riskyInsight?.href ?? "/estimates",
      actionLabel: "Review at-risk work",
      tone: riskyInsight ? "warning" : "info",
    },
    {
      id: "proposal-conversion",
      title: "Proposal conversion recommendations",
      summary:
        conversionInsight?.title ??
        (followUpCount > 0
          ? `${followUpCount} proposal${followUpCount === 1 ? "" : "s"} need follow-up`
          : `Win rate is ${formatPercent(data.executive.winRate)} for this period`),
      detail:
        conversionInsight?.recommendedAction ??
        (followUpCount > 0
          ? "Follow up on sent proposals to improve close rates."
          : "Send more proposals to build a reliable conversion baseline."),
      href: conversionInsight?.href ?? "/proposals",
      actionLabel: followUpCount > 0 ? "Review proposals" : "Create proposal",
      tone:
        followUpCount > 0 || data.executive.winRate < 40 ? "warning" : "info",
    },
  ];
}

function InsightCardView({ card }: { card: InsightCard }) {
  const styles = toneStyles[card.tone];

  return (
    <article className="flex h-full flex-col rounded-xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-lg",
            styles.icon
          )}
        >
          {card.tone === "warning" ? (
            <AlertTriangle className="size-5" />
          ) : card.tone === "success" ? (
            <TrendingUp className="size-5" />
          ) : (
            <Target className="size-5" />
          )}
        </div>
        <span
          className={cn(
            "rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide",
            styles.badge
          )}
        >
          AI insight
        </span>
      </div>

      <h3 className="mt-4 text-sm font-semibold tracking-tight">{card.title}</h3>
      <p className="mt-2 text-sm font-medium leading-snug">{card.summary}</p>
      <p className="mt-2 flex-1 text-sm text-muted-foreground">{card.detail}</p>

      {card.href && card.actionLabel ? (
        <Link
          href={card.href}
          className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary"
        >
          {card.actionLabel}
          <ArrowRight className="size-4" />
        </Link>
      ) : null}
    </article>
  );
}

export function AnalyticsAiSummary(props: AnalyticsAiSummaryProps) {
  const isEmpty = isAnalyticsPortfolioEmpty(props.data);
  const cards = buildInsightCards(props);

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="border-b border-border bg-gradient-to-r from-slate-950 via-slate-900 to-slate-800 px-6 py-6 text-white">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15">
              <Sparkles className="size-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-semibold tracking-tight">
                  AI Insights
                </h2>
                <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-xs font-medium ring-1 ring-white/10">
                  <Zap className="size-3.5" />
                  Trend summary
                </span>
              </div>
              <p className="mt-2 max-w-3xl text-sm text-white/75">
                {props.aiInsights.businessCoach.summary}
              </p>
            </div>
          </div>
          <span className="rounded-full bg-white/10 px-3 py-1.5 text-sm font-medium ring-1 ring-white/10">
            {props.aiInsights.source === "rules"
              ? "Standard recommendations"
              : "AI-powered"}
          </span>
        </div>
      </div>

      <div className="p-6">
        {isEmpty ? (
          <AnalyticsEmptyState
            compact
            icon={Sparkles}
            title="Insights appear as your pipeline grows"
            description="Create estimates and send proposals to unlock profitability, margin, and conversion recommendations."
            actionLabel="Create your first estimate"
            actionHref="/estimates"
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {cards.map((card) => (
              <InsightCardView key={card.id} card={card} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
