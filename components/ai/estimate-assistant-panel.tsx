"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import {
  ArrowDownToLine,
  Loader2,
  RefreshCw,
  Send,
  Sparkles,
  X,
} from "lucide-react";

import {
  applyAiEstimateRecommendations,
  loadEstimateAiSession,
} from "@/app/(dashboard)/estimates/ai-actions";
import { Button } from "@/components/ui/button";
import {
  countRecommendationsByCategory,
  mergeAiRecommendations,
  summarizeMarkupChanges,
} from "@/lib/estimates/apply-ai-recommendations";
import {
  calculateEstimateTotals,
  formatCurrency,
  formatPercent,
} from "@/lib/estimates/calculations";
import { ESTIMATE_CATEGORY_LABELS } from "@/lib/estimates/types";
import type {
  AiEstimateAssistantContext,
  AiEstimateAssistantMessage,
  AiEstimateAssistantRecommendation,
} from "@/lib/ai/types";
import type { EstimateBuilderState } from "@/lib/estimates/types";
import { cn } from "@/lib/utils";

type EstimateAssistantPanelProps = {
  open: boolean;
  onClose: () => void;
  estimateId: string;
  currentState: EstimateBuilderState;
  context: AiEstimateAssistantContext;
  onApplyRecommendations: (
    nextState: EstimateBuilderState,
    savedAt?: string
  ) => void;
  onVersionsRefresh?: () => void;
};

type StreamStatus = "idle" | "streaming" | "error";

const STARTER_PROMPTS = [
  "Build a complete estimate for a 12,000 sq ft office tenant improvement with new LED lighting and receptacle circuits.",
  "Add labor and materials for a 400A electrical service upgrade with new switchgear.",
  "Estimate conduit, wire, and labor for 2,500 LF of 2-inch EMT with 30 receptacle branches.",
];

function formatMessageTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function parseSseChunk(buffer: string) {
  const events: Array<{ event: string; data: string }> = [];
  const chunks = buffer.split("\n\n");

  for (const chunk of chunks) {
    if (!chunk.trim()) {
      continue;
    }

    const lines = chunk.split("\n");
    let event = "message";
    let data = "";

    for (const line of lines) {
      if (line.startsWith("event:")) {
        event = line.slice(6).trim();
      } else if (line.startsWith("data:")) {
        data += line.slice(5).trim();
      }
    }

    if (data) {
      events.push({ event, data });
    }
  }

  return events;
}

function RecommendationPreview({
  recommendation,
  currentState,
}: {
  recommendation: AiEstimateAssistantRecommendation;
  currentState: EstimateBuilderState;
}) {
  const counts = countRecommendationsByCategory(recommendation.line_items);
  const markupChanges = summarizeMarkupChanges(currentState, recommendation.markup);
  const previewState = mergeAiRecommendations(currentState, recommendation);
  const previewTotals = calculateEstimateTotals(
    previewState.line_items,
    previewState.overhead_percent,
    previewState.contingency_percent,
    previewState.profit_margin_percent,
    previewState.tax_percent
  );

  return (
    <div className="space-y-4 rounded-lg border border-border bg-muted/20 p-4">
      <div>
        <p className="text-sm font-medium">{recommendation.summary}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Preview after insert: {formatCurrency(previewTotals.finalSellingPrice)} selling
          price · {formatPercent(previewTotals.grossMarginPercent)} gross margin
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-5">
        {Object.entries(counts).map(([category, count]) => (
          <div
            key={category}
            className="rounded-md border border-border bg-background px-2 py-1.5"
          >
            <p className="text-muted-foreground">
              {ESTIMATE_CATEGORY_LABELS[category as keyof typeof ESTIMATE_CATEGORY_LABELS]}
            </p>
            <p className="font-medium tabular-nums">{count} item(s)</p>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Markup recommendations
        </p>
        {markupChanges.map((item) => (
          <div
            key={item.label}
            className="rounded-md border border-border bg-background px-3 py-2"
          >
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{item.label}</span>
              <span className="tabular-nums">
                {formatPercent(item.current)} → {formatPercent(item.recommended)}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{item.reasoning}</p>
          </div>
        ))}
      </div>

      {recommendation.line_items.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Suggested line items
          </p>
          <div className="max-h-56 space-y-2 overflow-y-auto">
            {recommendation.line_items.map((item, index) => (
              <div
                key={`${item.category}-${item.description}-${index}`}
                className="rounded-md border border-border bg-background px-3 py-2"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">{item.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {ESTIMATE_CATEGORY_LABELS[item.category]} · {item.quantity}{" "}
                      {item.unit} @ {formatCurrency(item.unit_cost)}
                    </p>
                  </div>
                  <p className="text-sm font-medium tabular-nums">
                    {formatCurrency(item.quantity * item.unit_cost)}
                  </p>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{item.reasoning}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function EstimateAssistantPanel({
  open,
  onClose,
  estimateId,
  currentState,
  context,
  onApplyRecommendations,
  onVersionsRefresh,
}: EstimateAssistantPanelProps) {
  const [messages, setMessages] = useState<AiEstimateAssistantMessage[]>([]);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<StreamStatus>("idle");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [streamingExplanation, setStreamingExplanation] = useState("");
  const [activeRecommendation, setActiveRecommendation] =
    useState<AiEstimateAssistantRecommendation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [pending, startTransition] = useTransition();
  const [lastRequest, setLastRequest] = useState<{
    userMessage: string;
    history: Array<{ role: "user" | "assistant"; content: string }>;
  } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    let cancelled = false;

    async function loadHistory() {
      setLoadingHistory(true);
      setError(null);

      const result = await loadEstimateAiSession(estimateId);

      if (cancelled) {
        return;
      }

      setLoadingHistory(false);

      if (result.error) {
        setError(result.error);
        return;
      }

      setMessages(result.session?.messages ?? []);

      const lastAssistant = [...(result.session?.messages ?? [])]
        .reverse()
        .find((message) => message.role === "assistant" && message.recommendations);

      if (lastAssistant?.recommendations) {
        setActiveRecommendation(lastAssistant.recommendations);
      }
    }

    void loadHistory();

    return () => {
      cancelled = true;
    };
  }, [open, estimateId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingExplanation, activeRecommendation, scrollToBottom]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  async function runAssistantRequest(
    userMessage: string,
    history: Array<{ role: "user" | "assistant"; content: string }>
  ) {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setStatus("streaming");
    setError(null);
    setStatusMessage("Starting AI estimate analysis...");
    setStreamingExplanation("");
    setActiveRecommendation(null);
    setLastRequest({ userMessage, history });

    const optimisticUserMessage: AiEstimateAssistantMessage = {
      id: `temp-user-${Date.now()}`,
      role: "user",
      content: userMessage,
      recommendations: null,
      created_at: new Date().toISOString(),
    };

    setMessages((current) => [...current, optimisticUserMessage]);

    try {
      const response = await fetch("/api/ai/estimate-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          estimateId,
          userMessage,
          state: currentState,
          context,
          history,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(payload?.error ?? "AI estimating request failed.");
      }

      if (!response.body) {
        throw new Error("No response stream received from AI service.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let explanation = "";
      let recommendations: AiEstimateAssistantRecommendation | null = null;
      let assistantMessageId = `temp-assistant-${Date.now()}`;

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";

        for (const part of parts) {
          const events = parseSseChunk(`${part}\n\n`);

          for (const event of events) {
            const payload = JSON.parse(event.data) as Record<string, unknown>;

            if (event.event === "status") {
              setStatusMessage(String(payload.message ?? "Working..."));
            }

            if (event.event === "explanation_delta") {
              explanation += String(payload.text ?? "");
              setStreamingExplanation(explanation);
            }

            if (event.event === "recommendations") {
              recommendations =
                payload.recommendations as AiEstimateAssistantRecommendation;
              assistantMessageId = String(payload.messageId ?? assistantMessageId);
              setActiveRecommendation(recommendations);
              setStreamingExplanation("");
            }

            if (event.event === "error") {
              throw new Error(String(payload.message ?? "AI estimating failed."));
            }
          }
        }
      }

      if (!recommendations) {
        throw new Error("AI response did not include structured recommendations.");
      }

      const assistantMessage: AiEstimateAssistantMessage = {
        id: assistantMessageId,
        role: "assistant",
        content: recommendations.explanation,
        recommendations,
        created_at: new Date().toISOString(),
      };

      setMessages((current) => {
        const withoutTemps = current.filter(
          (message) => !message.id.startsWith("temp-")
        );
        return [...withoutTemps, optimisticUserMessage, assistantMessage];
      });

      setStatus("idle");
      setStatusMessage(null);
    } catch (requestError) {
      if (controller.signal.aborted) {
        return;
      }

      setStatus("error");
      setStatusMessage(null);
      setStreamingExplanation("");
      setMessages((current) =>
        current.filter((message) => !message.id.startsWith("temp-"))
      );
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to generate AI estimate recommendations."
      );
    }
  }

  function handleSend(message?: string) {
    const trimmed = (message ?? input).trim();

    if (!trimmed || status === "streaming") {
      return;
    }

    const history = messages.map((entry) => ({
      role: entry.role,
      content: entry.content,
    }));

    setInput("");
    void runAssistantRequest(trimmed, history);
  }

  function handleRetry() {
    if (!lastRequest || status === "streaming") {
      return;
    }

    void runAssistantRequest(lastRequest.userMessage, lastRequest.history);
  }

  function handleApply() {
    if (!activeRecommendation) {
      return;
    }

    const nextState = mergeAiRecommendations(currentState, activeRecommendation);

    startTransition(async () => {
      const result = await applyAiEstimateRecommendations(estimateId, nextState);

      if (result.error) {
        setError(result.error);
        return;
      }

      onApplyRecommendations(nextState, result.savedAt);
      onVersionsRefresh?.();
      setError(null);
    });
  }

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-background/70 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close AI estimating assistant"
      />

      <div className="relative z-10 flex h-full w-full max-w-2xl flex-col border-l border-border bg-card shadow-2xl">
        <div className="flex items-start justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Sparkles className="size-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold">AI Estimating Engine</h2>
              <p className="text-sm text-muted-foreground">
                Describe the project — review recommendations before inserting
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
          {loadingHistory ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Loading conversation...
            </div>
          ) : null}

          {messages.length === 0 && !loadingHistory ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Tell the AI about the commercial electrical scope. It will suggest
                labor hours, materials, equipment, quantities, and markup percentages
                with reasoning for each recommendation.
              </p>
              <div className="space-y-2">
                {STARTER_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => handleSend(prompt)}
                    disabled={status === "streaming"}
                    className="w-full rounded-lg border border-border px-4 py-3 text-left text-sm transition-colors hover:bg-muted/30"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex",
                message.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              <div
                className={cn(
                  "max-w-[90%] rounded-xl px-4 py-3 text-sm",
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "border border-border bg-background"
                )}
              >
                <p className="whitespace-pre-wrap">{message.content}</p>
                <p
                  className={cn(
                    "mt-2 text-[11px]",
                    message.role === "user"
                      ? "text-primary-foreground/70"
                      : "text-muted-foreground"
                  )}
                >
                  {formatMessageTime(message.created_at)}
                </p>
              </div>
            </div>
          ))}

          {status === "streaming" && streamingExplanation ? (
            <div className="rounded-xl border border-border bg-background px-4 py-3 text-sm">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                AI explanation
              </p>
              <p className="whitespace-pre-wrap">{streamingExplanation}</p>
            </div>
          ) : null}

          {status === "streaming" && !streamingExplanation ? (
            <div className="flex items-center gap-2 rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              {statusMessage ?? "Generating estimate recommendations..."}
            </div>
          ) : null}

          {activeRecommendation ? (
            <RecommendationPreview
              recommendation={activeRecommendation}
              currentState={currentState}
            />
          ) : null}

          {error ? (
            <div className="space-y-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              <p>{error}</p>
              {lastRequest ? (
                <Button variant="outline" size="sm" onClick={handleRetry}>
                  <RefreshCw data-icon="inline-start" />
                  Retry
                </Button>
              ) : null}
            </div>
          ) : null}

          <div ref={messagesEndRef} />
        </div>

        <div className="space-y-3 border-t border-border px-5 py-4">
          {activeRecommendation ? (
            <Button
              className="w-full"
              onClick={handleApply}
              disabled={pending || status === "streaming"}
            >
              <ArrowDownToLine data-icon="inline-start" />
              {pending ? "Inserting recommendations..." : "Insert into estimate"}
            </Button>
          ) : null}

          <div className="flex gap-2">
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              rows={3}
              placeholder="Describe the electrical scope, quantities, or what you need estimated..."
              disabled={status === "streaming"}
              className="min-h-[84px] flex-1 resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  handleSend();
                }
              }}
            />
            <Button
              onClick={() => handleSend()}
              disabled={!input.trim() || status === "streaming"}
              className="self-end"
            >
              {status === "streaming" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function EstimateAssistantButton({
  onClick,
  loading,
}: {
  onClick: () => void;
  loading?: boolean;
}) {
  return (
    <Button variant="outline" onClick={onClick} disabled={loading}>
      <Sparkles data-icon="inline-start" />
      {loading ? "AI working..." : "AI Estimate"}
    </Button>
  );
}
