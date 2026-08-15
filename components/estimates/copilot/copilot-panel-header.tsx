import { Bot, X } from "lucide-react";

type CopilotPanelHeaderProps = {
  onClose: () => void;
};

export function CopilotPanelHeader({ onClose }: CopilotPanelHeaderProps) {
  return (
    <div className="flex items-start justify-between border-b border-border px-5 py-4">
      <div className="flex items-start gap-3">
        <div className="flex size-10 items-center justify-center rounded-lg bg-violet-500/10 text-violet-700 dark:text-violet-300">
          <Bot className="size-5" />
        </div>
        <div>
          <h2 className="text-base font-semibold">Estimate Copilot</h2>
          <p className="text-sm text-muted-foreground">
            Review recommendations before applying changes to this estimate.
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="flex size-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        aria-label="Close copilot panel"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
