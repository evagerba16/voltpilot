import type { ReactNode } from "react";
import { Zap } from "lucide-react";

import { VP_INTELLIGENCE_LABEL, vpTheme } from "@/lib/ui/vp-theme";
import { cn } from "@/lib/utils";

type IntelligenceSectionHeaderProps = {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
};

export function IntelligenceSectionHeader({
  title,
  description,
  action,
  className,
}: IntelligenceSectionHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between", className)}>
      <div className="min-w-0 space-y-2">
        <p className={vpTheme.intelligenceBadge}>
          <Zap className="size-3 fill-brand/20" aria-hidden="true" />
          {VP_INTELLIGENCE_LABEL}
        </p>
        <h2 className="text-base font-semibold tracking-tight text-foreground">{title}</h2>
        {description ? (
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
