import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type PageMainProps = {
  children: ReactNode;
  className?: string;
  /** Max width container variant */
  width?: "default" | "narrow" | "full";
};

const widthClasses = {
  default: "max-w-7xl",
  narrow: "max-w-5xl",
  full: "max-w-none",
};

export function PageMain({
  children,
  className,
  width = "default",
}: PageMainProps) {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className={cn(
        "flex-1 overflow-y-auto p-4 outline-none motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200 sm:p-6",
        className
      )}
    >
      <div className={cn("mx-auto space-y-6", widthClasses[width])}>{children}</div>
    </main>
  );
}

export function PageIntro({
  description,
  children,
}: {
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      {description ? (
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      ) : null}
      {children ? <div className="shrink-0">{children}</div> : null}
    </div>
  );
}
