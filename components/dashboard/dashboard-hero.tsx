import Link from "next/link";
import { BarChart3, Sparkles } from "lucide-react";

import { DashboardGreeting } from "@/components/dashboard/dashboard-greeting";
import { buttonVariants } from "@/components/ui/button-variants";
import { ENTITY_PRIMARY_QUESTIONS } from "@/lib/ui/entity-page-copy";
import type { DashboardPrimaryAction } from "@/lib/dashboard/primary-action";
import { cn } from "@/lib/utils";

type DashboardHeroProps = {
  organizationName: string;
  displayName: string;
  isPortfolioEmpty: boolean;
  primaryAction: DashboardPrimaryAction;
};

export function DashboardHero({
  organizationName,
  displayName,
  isPortfolioEmpty,
  primaryAction,
}: DashboardHeroProps) {
  const ActionIcon = primaryAction.icon;

  return (
    <section className="rounded-2xl border border-border bg-card px-6 py-8 shadow-sm sm:px-8 sm:py-10">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl space-y-2">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Dashboard
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            <DashboardGreeting displayName={displayName} />
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
            {isPortfolioEmpty
              ? `${ENTITY_PRIMARY_QUESTIONS.dashboard} Start with a customer or project to see your pipeline here.`
              : `${organizationName} — ${ENTITY_PRIMARY_QUESTIONS.dashboard}`}
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:max-w-xs sm:items-end">
          <Link
            href={primaryAction.href}
            className={cn(buttonVariants({ className: "gap-2 rounded-full" }))}
          >
            <ActionIcon className="size-4" />
            {primaryAction.label}
          </Link>
          <p className="text-right text-xs leading-relaxed text-muted-foreground">
            {primaryAction.context}
          </p>

          {!isPortfolioEmpty ? (
            <div className="flex flex-wrap justify-end gap-x-4 gap-y-1 text-sm">
              <Link
                href="/analytics"
                className="inline-flex items-center gap-1 font-medium text-muted-foreground transition-colors hover:text-primary"
              >
                <BarChart3 className="size-3.5" />
                View Analytics
              </Link>
              <Link
                href="/ai"
                className="inline-flex items-center gap-1 font-medium text-muted-foreground transition-colors hover:text-primary"
              >
                <Sparkles className="size-3.5" />
                Command Center
              </Link>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
