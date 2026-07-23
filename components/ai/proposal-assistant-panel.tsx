"use client";

import { useState, useTransition } from "react";
import {
  AlertTriangle,
  CircleAlert,
  Info,
  Loader2,
  Sparkles,
  X,
} from "lucide-react";

import { aiAssistProposal } from "@/app/(dashboard)/ai/actions";
import { Button } from "@/components/ui/button";
import { PROPOSAL_ASSISTANT_TASKS } from "@/lib/ai/proposal-assistant";
import type {
  ProposalAssistantContext,
  ProposalAssistantTask,
} from "@/lib/ai/types";
import type { ProposalEditorState } from "@/lib/proposals/types";
import { cn } from "@/lib/utils";

type ProposalAssistantPanelProps = {
  open: boolean;
  onClose: () => void;
  currentState: ProposalEditorState;
  context: ProposalAssistantContext;
  onApplySuggestion: (field: keyof ProposalEditorState, content: string) => void;
};

const TASKS: Array<{ task: ProposalAssistantTask; label: string; description: string }> = [
  {
    task: "scope_of_work",
    label: "Generate scope of work",
    description: "Professional scope from estimate line items",
  },
  {
    task: "rewrite_professional",
    label: "Rewrite professionally",
    description: "Polish tone for client delivery",
  },
  {
    task: "improve_clarity",
    label: "Improve clarity",
    description: "Better structure and readability",
  },
  {
    task: "project_summary",
    label: "Project summary",
    description: "Executive overview for the proposal",
  },
  {
    task: "exclusions",
    label: "Generate exclusions",
    description: "Standard commercial exclusions",
  },
  {
    task: "assumptions",
    label: "Generate assumptions",
    description: "Key bid assumptions and conditions",
  },
];

export function ProposalAssistantPanel({
  open,
  onClose,
  currentState,
  context,
  onApplySuggestion,
}: ProposalAssistantPanelProps) {
  const [selectedTask, setSelectedTask] = useState<ProposalAssistantTask | null>(null);
  const [generatedContent, setGeneratedContent] = useState<string | null>(null);
  const [generatedField, setGeneratedField] = useState<keyof ProposalEditorState | null>(null);
  const [generatedLabel, setGeneratedLabel] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aiEnabled, setAiEnabled] = useState<boolean | null>(null);
  const [pending, startTransition] = useTransition();

  if (!open) {
    return null;
  }

  function handleGenerate(task: ProposalAssistantTask) {
    setSelectedTask(task);
    setGeneratedContent(null);
    setGeneratedField(null);
    setGeneratedLabel(null);
    setError(null);

    startTransition(async () => {
      const result = await aiAssistProposal({
        task,
        currentState,
        context,
      });

      if (result.error) {
        setError(result.error);
        return;
      }

      if (result.result) {
        setGeneratedContent(result.result.content);
        setGeneratedField(result.result.field);
        setGeneratedLabel(result.result.label);
        setAiEnabled(result.result.aiEnabled);
      }
    });
  }

  function handleApply() {
    if (!generatedField || !generatedContent) {
      return;
    }

    onApplySuggestion(generatedField, generatedContent);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-background/70 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close proposal assistant"
      />

      <div className="relative z-10 flex h-full w-full max-w-lg flex-col border-l border-border bg-card shadow-2xl">
        <div className="flex items-start justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Sparkles className="size-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold">AI Proposal Assistant</h2>
              <p className="text-sm text-muted-foreground">
                Generate content — you choose what to apply
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <div className="space-y-2">
            {TASKS.map((item) => (
              <button
                key={item.task}
                type="button"
                onClick={() => handleGenerate(item.task)}
                disabled={pending}
                className={cn(
                  "w-full rounded-lg border px-4 py-3 text-left transition-colors hover:bg-muted/30",
                  selectedTask === item.task
                    ? "border-primary bg-primary/5"
                    : "border-border"
                )}
              >
                <p className="text-sm font-medium">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.description}</p>
              </button>
            ))}
          </div>

          {pending ? (
            <div className="flex items-center gap-2 rounded-lg border border-dashed border-border px-4 py-8 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Generating with AI...
            </div>
          ) : null}

          {error ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          ) : null}

          {generatedContent ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">{generatedLabel}</p>
                {aiEnabled === false ? (
                  <span className="text-xs text-muted-foreground">Draft template</span>
                ) : null}
              </div>
              <div className="max-h-64 overflow-y-auto rounded-lg border border-border bg-muted/20 p-4 text-sm whitespace-pre-wrap">
                {generatedContent}
              </div>
              <p className="text-xs text-muted-foreground">
                Review before applying. This will replace the current{" "}
                {PROPOSAL_ASSISTANT_TASKS[selectedTask!]?.field ?? "field"} content.
              </p>
              <Button onClick={handleApply} className="w-full">
                Apply to proposal
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function ProposalAssistantButton({ onClick }: { onClick: () => void }) {
  return (
    <Button variant="outline" onClick={onClick}>
      <Sparkles data-icon="inline-start" />
      AI Assistant
    </Button>
  );
}

export function ProjectInsightIcon({
  severity,
}: {
  severity: "info" | "warning" | "critical";
}) {
  if (severity === "critical") {
    return <CircleAlert className="size-4 text-destructive" />;
  }

  if (severity === "warning") {
    return <AlertTriangle className="size-4 text-amber-600" />;
  }

  return <Info className="size-4 text-primary" />;
}
