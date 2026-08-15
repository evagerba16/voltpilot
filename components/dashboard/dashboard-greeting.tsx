"use client";

import { formatPersonalGreeting } from "@/lib/dashboard/greeting";

type DashboardGreetingProps = {
  displayName: string;
  className?: string;
};

export function DashboardGreeting({ displayName, className }: DashboardGreetingProps) {
  return (
    <span className={className} suppressHydrationWarning>
      {formatPersonalGreeting(displayName)}
    </span>
  );
}
