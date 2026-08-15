"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type AnalyticsChartFrameProps = {
  children: ReactNode;
  className?: string;
  height?: "sm" | "md" | "lg";
};

const HEIGHTS = {
  sm: "h-56",
  md: "h-72",
  lg: "h-80",
} as const;

export function AnalyticsChartFrame({
  children,
  className,
  height = "md",
}: AnalyticsChartFrameProps) {
  return (
    <div
      className={cn(
        "w-full motion-safe:animate-in motion-safe:fade-in motion-safe:duration-500 motion-safe:fill-mode-backwards",
        HEIGHTS[height],
        className
      )}
    >
      {children}
    </div>
  );
}
