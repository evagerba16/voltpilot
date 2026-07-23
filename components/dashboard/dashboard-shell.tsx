"use client";

import type { ReactNode } from "react";

import { DashboardProvider } from "@/components/dashboard/dashboard-context";
import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { ConfirmProvider } from "@/components/ui/confirm-provider";
import { ToastProvider } from "@/components/ui/toast-provider";

import type { TeamPermission } from "@/lib/teams/types";
import type { TeamRole } from "@/lib/teams/types";

type DashboardShellProps = {
  children: ReactNode;
  companyName: string;
  userEmail: string;
  roleLabel: TeamRole;
  permissions: TeamPermission[];
};

export function DashboardShell({
  children,
  companyName,
  userEmail,
  roleLabel,
  permissions,
}: DashboardShellProps) {
  return (
    <ToastProvider>
      <ConfirmProvider>
        <DashboardProvider
          companyName={companyName}
          userEmail={userEmail}
          roleLabel={roleLabel}
          permissions={permissions}
        >
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[200] focus:rounded-lg focus:border focus:border-border focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:shadow-lg"
          >
            Skip to main content
          </a>
          <div className="flex h-screen flex-col overflow-hidden bg-muted/30 md:flex-row">
            <DashboardSidebar />
            <div className="flex min-w-0 flex-1 flex-col overflow-hidden outline-none">
              {children}
            </div>
          </div>
        </DashboardProvider>
      </ConfirmProvider>
    </ToastProvider>
  );
}
