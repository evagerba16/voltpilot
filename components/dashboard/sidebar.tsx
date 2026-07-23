"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight, Zap } from "lucide-react";

import { useDashboard } from "@/components/dashboard/dashboard-context";
import { DASHBOARD_NAV_ITEMS } from "@/lib/dashboard/nav";
import { filterNavItemsByPermissions } from "@/lib/teams/permissions";
import { TEAM_ROLE_LABELS } from "@/lib/teams/types";
import { cn } from "@/lib/utils";

export function DashboardSidebar() {
  const pathname = usePathname();
  const { collapsed, toggleCollapsed, permissions, roleLabel } = useDashboard();
  const navItems = filterNavItemsByPermissions(DASHBOARD_NAV_ITEMS, permissions);

  return (
    <>
      <aside
        className={cn(
          "hidden h-full shrink-0 flex-col border-r border-border bg-sidebar text-sidebar-foreground transition-[width] duration-200 md:flex",
          collapsed ? "w-[72px]" : "w-64"
        )}
      >
        <div
          className={cn(
            "flex h-16 items-center border-b border-sidebar-border",
            collapsed ? "justify-center px-2" : "justify-between px-4"
          )}
        >
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Zap className="size-4" />
            </span>
            {!collapsed ? (
              <span className="font-semibold tracking-tight">VoltPilot</span>
            ) : null}
          </Link>
          {!collapsed ? (
            <button
              type="button"
              onClick={toggleCollapsed}
              className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
              aria-label="Collapse sidebar"
            >
              <ChevronLeft className="size-4" />
            </button>
          ) : null}
        </div>

        {collapsed ? (
          <div className="flex justify-center py-3">
            <button
              type="button"
              onClick={toggleCollapsed}
              className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
              aria-label="Expand sidebar"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        ) : null}

        <nav className="flex-1 space-y-1 p-3">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={cn(
                  "flex items-center rounded-lg text-sm font-medium transition-colors",
                  collapsed ? "justify-center px-2 py-2.5" : "gap-3 px-3 py-2",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                )}
              >
                <item.icon className="size-4 shrink-0" />
                {!collapsed ? item.label : null}
              </Link>
            );
          })}
        </nav>

        {!collapsed ? (
          <div className="border-t border-sidebar-border p-4">
            <p className="text-xs text-muted-foreground">VoltPilot v0.1.0</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {TEAM_ROLE_LABELS[roleLabel]}
            </p>
          </div>
        ) : null}
      </aside>

      <nav
        className="flex gap-1 overflow-x-auto border-b border-border bg-sidebar px-3 py-2 md:hidden"
        aria-label="Main navigation"
      >
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "shrink-0 rounded-lg px-3 py-2 text-xs font-medium transition-colors min-h-9 flex items-center",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent/50"
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
