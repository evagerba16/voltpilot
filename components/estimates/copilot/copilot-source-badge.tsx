import type { CopilotReasoningSource } from "@/lib/copilot/types";
import { formatCopilotSource } from "@/lib/copilot/client/format-copilot-display";
import { cn } from "@/lib/utils";

const SOURCE_STYLES: Record<CopilotReasoningSource, string> = {
  catalog: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  rules: "bg-slate-500/10 text-slate-700 dark:text-slate-300",
  llm: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
  historical: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  benchmark: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
};

type CopilotSourceBadgeProps = {
  source: CopilotReasoningSource;
  className?: string;
};

export function CopilotSourceBadge({ source, className }: CopilotSourceBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
        SOURCE_STYLES[source],
        className
      )}
    >
      {formatCopilotSource(source)}
    </span>
  );
}
