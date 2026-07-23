"use client";

import { Bell, Menu } from "lucide-react";

import { GlobalSearch } from "@/components/dashboard/global-search";
import { useDashboard } from "@/components/dashboard/dashboard-context";
import { UserMenu } from "@/components/dashboard/user-menu";

type DashboardTopNavProps = {
  title: string;
};

export function DashboardTopNav({ title }: DashboardTopNavProps) {
  const { companyName, toggleCollapsed } = useDashboard();

  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-border bg-background px-4 sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={toggleCollapsed}
          className="hidden size-9 shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:flex lg:hidden"
          aria-label="Toggle sidebar"
        >
          <Menu className="size-4" />
        </button>

        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-muted-foreground">
            {companyName}
          </p>
          <h1 className="truncate text-lg font-semibold tracking-tight">
            {title}
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        <GlobalSearch />

        <button
          type="button"
          disabled
          title="Notifications coming soon"
          className="relative flex size-9 cursor-not-allowed items-center justify-center rounded-lg border border-border text-muted-foreground opacity-60"
          aria-label="Notifications (coming soon)"
        >
          <Bell className="size-4" />
        </button>

        <UserMenu />
      </div>
    </header>
  );
}
