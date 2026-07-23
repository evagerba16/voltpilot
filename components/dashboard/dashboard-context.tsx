"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

import type { TeamPermission } from "@/lib/teams/types";
import type { TeamRole } from "@/lib/teams/types";

type DashboardContextValue = {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  toggleCollapsed: () => void;
  companyName: string;
  userEmail: string;
  roleLabel: TeamRole;
  permissions: TeamPermission[];
};

const DashboardContext = createContext<DashboardContextValue | null>(null);

type DashboardProviderProps = {
  children: ReactNode;
  companyName: string;
  userEmail: string;
  roleLabel: TeamRole;
  permissions: TeamPermission[];
};

export function DashboardProvider({
  children,
  companyName,
  userEmail,
  roleLabel,
  permissions,
}: DashboardProviderProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <DashboardContext.Provider
      value={{
        collapsed,
        setCollapsed,
        toggleCollapsed: () => setCollapsed((value) => !value),
        companyName,
        userEmail,
        roleLabel,
        permissions,
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const context = useContext(DashboardContext);

  if (!context) {
    throw new Error("useDashboard must be used within a DashboardProvider");
  }

  return context;
}
