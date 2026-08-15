"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";

import { createProposalFromEstimate } from "@/app/(dashboard)/proposals/actions";
import {
  autosaveEstimate,
  deleteEstimate,
  duplicateEstimate,
  fetchEstimateVersions,
  finalizeEstimate,
  reopenEstimate,
  saveEstimate,
} from "@/app/(dashboard)/estimates/actions";
import { EstimateAiInsightsCompact } from "@/components/estimates/estimate-ai-insights-compact";
import { EstimateLessonsCompact } from "@/components/estimates/estimate-lessons-compact";
import { EstimateBuilderOverflowMenu } from "@/components/estimates/estimate-builder-overflow-menu";
import {
  EstimateWorkspaceHeader,
  EstimateWorkspaceToolbar,
} from "@/components/estimates/estimate-workspace-header";
import { BulkActionsToolbar } from "@/components/estimates/bulk-actions-toolbar";
import { EstimateSection } from "@/components/estimates/estimate-section";
import type { LineItemPickerSelection } from "@/components/estimates/line-item-picker";
import {
  EstimateTemplatesDialog,
} from "@/components/estimates/estimate-templates-dialog";
import { EstimateSummary } from "@/components/estimates/estimate-summary";
import {
  EstimateVersionHistory,
} from "@/components/estimates/estimate-version-history";
import { AssembliesLibraryPanel } from "@/components/estimates/assemblies-library-panel";
import { AlertBanner } from "@/components/ui/alert-banner";
import { Modal } from "@/components/ui/modal";
import { useConfirm } from "@/components/ui/confirm-provider";
import {
  buildLineItemFromSuggestion,
  type AiReviewRecommendation,
  type AiReviewResult,
} from "@/lib/ai/ai-review-service";
import {
  buildLineItemsFromAssembly,
  type EstimateAssembly,
} from "@/lib/estimates/assemblies";
import { recordAssemblyUse } from "@/lib/estimates/assembly-catalogs/recents";
import { recordLineItemUse } from "@/lib/estimates/line-item-catalogs/recents";
import {
  calculateEstimateTotals,
  formatCurrency,
  formatPercent,
} from "@/lib/estimates/calculations";
import {
  applyBulkMarkupToLineItems,
  createEmptyLineItem,
  getAllLineItemLocalIds,
  getLineItemLocalId,
  moveLineItemsToCategory,
  normalizeLineItemsByCategory,
  removeLineItemsByLocalIds,
  reorderCategoryLineItems,
} from "@/lib/estimates/line-item-utils";
import { useKeyboardShortcut } from "@/lib/hooks/use-keyboard-shortcut";
import {
  AUTOSAVE_DEBOUNCE_MS,
  ESTIMATE_CATEGORIES,
  ESTIMATE_CATEGORY_LABELS,
  type EstimateBuilderState,
  type EstimateCategory,
  type EstimateLineItemInput,
  type EstimateStatus,
  type EstimateVersion,
  type EstimateWithProject,
} from "@/lib/estimates/types";
import { normalizeUnitForCategory } from "@/lib/estimates/units";
import { isEstimateCopilotEnabled } from "@/lib/copilot/client/feature-flag";
import {
  resolveEstimatePrimaryAction,
  shouldShowFinalizeSecondary,
} from "@/lib/estimates/primary-action";
import type { EstimateGuidance } from "@/lib/lessons/types";

const estimateCopilotEnabled = isEstimateCopilotEnabled();

const AIReviewPanel = dynamic(
  () =>
    import("@/components/estimates/AIReviewPanel").then(
      (module) => module.AIReviewPanel
    ),
  { ssr: false }
);

const EstimateAssistantPanel = dynamic(
  () =>
    import("@/components/ai/estimate-assistant-panel").then(
      (module) => module.EstimateAssistantPanel
    ),
  { ssr: false }
);

const EstimateCopilotPanel = dynamic(
  () =>
    import("@/components/estimates/copilot/estimate-copilot-panel").then(
      (module) => module.EstimateCopilotPanel
    ),
  { ssr: false }
);

type EstimateBuilderProps = {
  estimateId: string;
  initialState: EstimateBuilderState;
  initialStatus: EstimateStatus;
  initialVersions: EstimateVersion[];
  project: EstimateWithProject["project"];
  guidance: EstimateGuidance;
};

type SaveStatus = "idle" | "saving" | "saved" | "error";

function formatEstimateStatus(status: EstimateStatus) {
  return status === "Draft" ? "In progress" : "Final";
}

function serializeState(state: EstimateBuilderState) {
  return JSON.stringify(state);
}

export function EstimateBuilder({
  estimateId,
  initialState,
  initialStatus,
  initialVersions,
  project,
  guidance,
}: EstimateBuilderProps) {
  const [state, setState] = useState(initialState);
  const [status, setStatus] = useState<EstimateStatus>(initialStatus);
  const [versions, setVersions] = useState(initialVersions);
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [reviewResult, setReviewResult] = useState<AiReviewResult | null>(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [assembliesOpen, setAssembliesOpen] = useState(false);
  const [overflowOpen, setOverflowOpen] = useState(false);
  const [selectedLineIds, setSelectedLineIds] = useState<Set<string>>(
    () => new Set()
  );
  const [pending, startTransition] = useTransition();
  const confirm = useConfirm();

  const lastSavedStateRef = useRef(serializeState(initialState));
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSavingRef = useRef(false);
  const selectedLineIdsRef = useRef(selectedLineIds);
  const reviewResultRef = useRef(reviewResult);

  selectedLineIdsRef.current = selectedLineIds;
  reviewResultRef.current = reviewResult;

  const isLocked = status === "Final";

  const hasLineItems = useMemo(
    () =>
      state.line_items.some(
        (item) => item.quantity > 0 && item.description.trim().length > 0
      ),
    [state.line_items]
  );

  const primaryAction = useMemo(
    () =>
      resolveEstimatePrimaryAction({
        status,
        hasLineItems,
        copilotEnabled: estimateCopilotEnabled,
      }),
    [status, hasLineItems]
  );

  const showFinalizeSecondary = shouldShowFinalizeSecondary({ status, hasLineItems });

  const reviewContext = useMemo(
    () => ({
      projectName: project.project_name,
      customerName: project.customer.company_name,
      projectAddress: project.project_address,
      projectType: project.project_type ?? "Commercial electrical",
    }),
    [
      project.project_name,
      project.customer.company_name,
      project.project_address,
      project.project_type,
    ]
  );

  const totals = useMemo(
    () =>
      calculateEstimateTotals(
        state.line_items,
        state.overhead_percent,
        state.contingency_percent,
        state.profit_margin_percent,
        state.tax_percent
      ),
    [
      state.line_items,
      state.overhead_percent,
      state.contingency_percent,
      state.profit_margin_percent,
      state.tax_percent,
    ]
  );

  const lineItemsByCategory = useMemo(() => {
    const grouped = Object.fromEntries(
      ESTIMATE_CATEGORIES.map((category) => [category, [] as EstimateLineItemInput[]])
    ) as Record<EstimateCategory, EstimateLineItemInput[]>;

    for (const item of state.line_items) {
      grouped[item.category].push(item);
    }

    return grouped;
  }, [state.line_items]);

  const markDirty = useCallback(() => {
    setSaveStatus("idle");
  }, []);

  const markDirtyRef = useRef(markDirty);
  markDirtyRef.current = markDirty;

  const updateLineItem = useCallback(
    (
      localId: string,
      field: keyof EstimateLineItemInput,
      value: string | number
    ) => {
      setState((current) => ({
        ...current,
        line_items: current.line_items.map((item, index) => {
          if (getLineItemLocalId(item, index) !== localId) {
            return item;
          }

          return {
            ...item,
            [field]: value,
          };
        }),
      }));
      markDirty();
    },
    [markDirty]
  );

  const applyPickerSelection = useCallback(
    (
      localId: string,
      selection: LineItemPickerSelection,
      currentItem: EstimateLineItemInput,
      category: EstimateCategory
    ) => {
      setState((current) => ({
        ...current,
        line_items: current.line_items.map((item, index) => {
          if (getLineItemLocalId(item, index) !== localId) {
            return item;
          }

          const nextItem = {
            ...item,
            description: selection.description,
          };

          if (selection.defaultUnit) {
            nextItem.unit = normalizeUnitForCategory(category, selection.defaultUnit);
          }

          if (
            selection.defaultUnitCost != null &&
            selection.defaultUnitCost > 0 &&
            currentItem.unit_cost === 0
          ) {
            nextItem.unit_cost = selection.defaultUnitCost;
          }

          if (
            selection.defaultUnitCost != null &&
            selection.defaultUnitCost > 0 &&
            currentItem.quantity === 0
          ) {
            nextItem.quantity = 1;
          }

          return nextItem;
        }),
      }));
      markDirty();
    },
    [markDirty]
  );

  const addLineItem = useCallback(
    (category: EstimateCategory) => {
      setState((current) => {
        const categoryItems = current.line_items.filter(
          (item) => item.category === category
        );

        return {
          ...current,
          line_items: [
            ...current.line_items,
            createEmptyLineItem(category, categoryItems.length),
          ],
        };
      });
      markDirty();
    },
    [markDirty]
  );

  const duplicateLineItem = useCallback(
    (localId: string) => {
      setState((current) => {
        const index = current.line_items.findIndex(
          (item, itemIndex) => getLineItemLocalId(item, itemIndex) === localId
        );

        if (index === -1) {
          return current;
        }

        const source = current.line_items[index];
        const duplicate: EstimateLineItemInput = {
          ...source,
          id: crypto.randomUUID(),
          description: source.description
            ? `${source.description} (copy)`
            : "",
          sort_order: source.sort_order + 1,
        };

        const nextItems = [...current.line_items];
        nextItems.splice(index + 1, 0, duplicate);

        return {
          ...current,
          line_items: nextItems.map((item, itemIndex) => ({
            ...item,
            sort_order: itemIndex,
          })),
        };
      });
      markDirty();
    },
    [markDirty]
  );

  const removeLineItem = useCallback(
    (localId: string) => {
      setState((current) => ({
        ...current,
        line_items: removeLineItemsByLocalIds(current.line_items, [localId]),
      }));
      setSelectedLineIds((current) => {
        const next = new Set(current);
        next.delete(localId);
        return next;
      });
      markDirty();
    },
    [markDirty]
  );

  const toggleLineSelection = useCallback((localId: string) => {
    setSelectedLineIds((current) => {
      const next = new Set(current);
      if (next.has(localId)) {
        next.delete(localId);
      } else {
        next.add(localId);
      }
      return next;
    });
  }, []);

  const toggleSelectAllInSection = useCallback(
    (localIds: string[], selected: boolean) => {
      setSelectedLineIds((current) => {
        const next = new Set(current);
        for (const localId of localIds) {
          if (selected) {
            next.add(localId);
          } else {
            next.delete(localId);
          }
        }
        return next;
      });
    },
    []
  );

  const clearLineSelection = useCallback(() => {
    setSelectedLineIds(new Set());
  }, []);

  const reorderLineItems = useCallback(
    (category: EstimateCategory, fromIndex: number, toIndex: number) => {
      setState((current) => ({
        ...current,
        line_items: reorderCategoryLineItems(
          current.line_items,
          category,
          fromIndex,
          toIndex
        ),
      }));
      markDirty();
    },
    [markDirty]
  );

  const reorderHandlers = useMemo(
    () =>
      Object.fromEntries(
        ESTIMATE_CATEGORIES.map((category) => [
          category,
          (fromIndex: number, toIndex: number) =>
            reorderLineItems(category, fromIndex, toIndex),
        ])
      ) as Record<EstimateCategory, (fromIndex: number, toIndex: number) => void>,
    [reorderLineItems]
  );

  const addLineItemHandlers = useMemo(
    () =>
      Object.fromEntries(
        ESTIMATE_CATEGORIES.map((category) => [
          category,
          () => addLineItem(category),
        ])
      ) as Record<EstimateCategory, () => void>,
    [addLineItem]
  );

  function bulkDeleteSelected() {
    const ids = [...selectedLineIds];
    if (ids.length === 0) {
      return;
    }

    setState((current) => ({
      ...current,
      line_items: removeLineItemsByLocalIds(current.line_items, ids),
    }));
    clearLineSelection();
    markDirty();
  }

  function bulkMoveSelected(targetCategory: EstimateCategory) {
    const ids = [...selectedLineIds];
    if (ids.length === 0) {
      return;
    }

    setState((current) => ({
      ...current,
      line_items: moveLineItemsToCategory(
        current.line_items,
        ids,
        targetCategory
      ),
    }));
    clearLineSelection();
    markDirty();
  }

  function bulkApplyMarkup(percentIncrease: number) {
    const ids = [...selectedLineIds];
    if (ids.length === 0) {
      return;
    }

    setState((current) => ({
      ...current,
      line_items: applyBulkMarkupToLineItems(
        current.line_items,
        ids,
        percentIncrease
      ),
    }));
    markDirty();
  }

  function insertAssembly(assembly: EstimateAssembly) {
    const newItems = buildLineItemsFromAssembly(
      assembly,
      state.line_items.length
    );

    setState((current) => ({
      ...current,
      line_items: normalizeLineItemsByCategory([
        ...current.line_items,
        ...newItems,
      ]),
    }));
    markDirty();
    recordAssemblyUse(assembly.id);
    for (const item of assembly.items) {
      if (item.category !== "miscellaneous") {
        recordLineItemUse(item.category, item.description);
      }
    }
  }

  const refreshVersions = useCallback(async () => {
    const result = await fetchEstimateVersions(estimateId);

    if (result.versions) {
      setVersions(result.versions);
    }
  }, [estimateId]);

  const handleSave = useCallback(() => {
    if (isLocked) {
      setError("This estimate is final. Reopen it before making changes.");
      setSaveStatus("error");
      return;
    }

    setError(null);

    startTransition(async () => {
      setSaveStatus("saving");
      const result = await saveEstimate(estimateId, state);

      if (result.error) {
        setError(result.error);
        setSaveStatus("error");
        return;
      }

      lastSavedStateRef.current = serializeState(state);
      setSavedAt(result.savedAt ?? new Date().toISOString());
      setSaveStatus("saved");
      await refreshVersions();
    });
  }, [estimateId, isLocked, state, refreshVersions]);

  useKeyboardShortcut({ key: "s", metaOrCtrl: true }, handleSave);
  useKeyboardShortcut({ key: "Escape" }, clearLineSelection);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const currentSelection = selectedLineIdsRef.current;
      if (currentSelection.size === 0) {
        return;
      }

      if (event.key !== "Delete" && event.key !== "Backspace") {
        return;
      }

      const target = event.target as HTMLElement | null;
      const isEditable =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.tagName === "SELECT" ||
        target?.isContentEditable;

      if (isEditable) {
        return;
      }

      event.preventDefault();
      const ids = [...currentSelection];
      setState((current) => ({
        ...current,
        line_items: removeLineItemsByLocalIds(current.line_items, ids),
      }));
      setSelectedLineIds(new Set());
      markDirtyRef.current();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    const validIds = new Set(getAllLineItemLocalIds(state.line_items));
    setSelectedLineIds((current) => {
      const next = new Set([...current].filter((id) => validIds.has(id)));
      return next.size === current.size ? current : next;
    });
  }, [state.line_items]);

  const runAutosave = useCallback(
    async (currentState: EstimateBuilderState) => {
      if (isLocked || isSavingRef.current) {
        return;
      }

      const serialized = serializeState(currentState);

      if (serialized === lastSavedStateRef.current) {
        return;
      }

      isSavingRef.current = true;
      setSaveStatus("saving");

      const result = await autosaveEstimate(estimateId, currentState);

      isSavingRef.current = false;

      if (result.error) {
        setError(result.error);
        setSaveStatus("error");
        return;
      }

      lastSavedStateRef.current = serialized;
      setSavedAt(result.savedAt ?? new Date().toISOString());
      setSaveStatus("saved");
    },
    [estimateId, isLocked]
  );

  useEffect(() => {
    if (isLocked) {
      return;
    }

    const serialized = serializeState(state);

    if (serialized === lastSavedStateRef.current) {
      return;
    }

    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }

    autosaveTimerRef.current = setTimeout(() => {
      void runAutosave(state);
    }, AUTOSAVE_DEBOUNCE_MS);

    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
    };
  }, [isLocked, state, runAutosave]);

  async function runReview() {
    const previousReview = reviewResultRef.current;
    setReviewLoading(true);
    setReviewError(null);
    setReviewResult(null);

    try {
      const response = await fetch("/api/ai/estimate-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          estimateId,
          state,
          context: reviewContext,
          previousRecommendations: previousReview?.recommendations.map((item) => ({
            id: item.id,
            title: item.title,
            category: item.category,
          })),
        }),
      });

      const payload = (await response.json()) as AiReviewResult | { error?: string };

      if (!response.ok) {
        setReviewError(
          "error" in payload && payload.error ?
            payload.error
          : "Unable to run estimate review."
        );
        return;
      }

      if ("error" in payload && payload.error) {
        setReviewError(payload.error);
        return;
      }

      if (!("recommendations" in payload)) {
        setReviewError("Unable to run estimate review.");
        return;
      }

      setReviewResult(payload);
    } catch (error) {
      setReviewError(
        error instanceof Error ?
          error.message
        : "Unable to run estimate review."
      );
    } finally {
      setReviewLoading(false);
    }
  }

  function scrollToSummary() {
    document
      .getElementById("estimate-summary")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function handleReviewAddMaterial(recommendation: AiReviewRecommendation) {
    const suggestion = recommendation.suggestedLineItem;

    if (!suggestion) {
      addLineItem("materials");
      return;
    }

    setState((current) => {
      const categoryItems = current.line_items.filter(
        (item) => item.category === suggestion.category
      );

      return {
        ...current,
        line_items: [
          ...current.line_items,
          buildLineItemFromSuggestion(suggestion, categoryItems.length),
        ],
      };
    });
    markDirty();
  }

  function handleReviewUpdateLabor(recommendation: AiReviewRecommendation) {
    const suggestion = recommendation.suggestedLineItem;

    if (suggestion?.category === "labor") {
      setState((current) => {
        const categoryItems = current.line_items.filter(
          (item) => item.category === "labor"
        );

        return {
          ...current,
          line_items: [
            ...current.line_items,
            buildLineItemFromSuggestion(suggestion, categoryItems.length),
          ],
        };
      });
      markDirty();
      return;
    }

    addLineItem("labor");
  }

  function handleReviewUpdateUnit(recommendation: AiReviewRecommendation) {
    if (recommendation.relatedLineItemId) {
      const lineId = recommendation.relatedLineItemId;
      const suggestedCost = recommendation.suggestedUnitCost;

      setState((current) => ({
        ...current,
        line_items: current.line_items.map((item, index) => {
          const localId = getLineItemLocalId(item, index);
          if (localId !== lineId && item.id !== lineId) {
            return item;
          }

          return {
            ...item,
            unit_cost:
              suggestedCost !== undefined && suggestedCost > 0 ?
                suggestedCost
              : item.unit_cost,
          };
        }),
      }));
      markDirty();
      scrollToSummary();
      return;
    }

    scrollToSummary();
  }

  function handleReviewIncreaseMarkup(recommendation: AiReviewRecommendation) {
    const increase = recommendation.suggestedMarkupIncrease ?? 3;

    applyProfitMargin(
      Math.min(50, Number((state.profit_margin_percent + increase).toFixed(2)))
    );
  }

  function applyProfitMargin(targetPercent: number) {
    setState((current) => ({
      ...current,
      profit_margin_percent: Math.min(50, Number(targetPercent.toFixed(2))),
    }));
    markDirty();
    scrollToSummary();
  }

  function handleOpenReview() {
    setReviewOpen(true);
    void runReview();
  }

  function handleRefreshReview() {
    void runReview();
  }

  function handleDuplicate() {
    startTransition(async () => {
      const result = await duplicateEstimate(estimateId);
      if (result?.error) {
        setError(result.error);
      }
    });
  }

  async function handleFinalize() {
    const confirmed = await confirm({
      title: `Mark ${state.title || "this estimate"} as final?`,
      description:
        "Final estimates are ready to send. You can reopen them later if you need to make changes.",
      confirmLabel: "Mark final",
    });

    if (!confirmed) {
      return;
    }

    startTransition(async () => {
      const result = await finalizeEstimate(estimateId);
      if (result?.error) {
        setError(result.error);
        return;
      }
      if (result.status) {
        setStatus(result.status);
      }
    });
  }

  async function handleReopen() {
    const confirmed = await confirm({
      title: `Reopen ${state.title || "this estimate"}?`,
      description: "This lets you edit line items and markups again.",
      confirmLabel: "Reopen estimate",
    });

    if (!confirmed) {
      return;
    }

    startTransition(async () => {
      const result = await reopenEstimate(estimateId);
      if (result?.error) {
        setError(result.error);
        return;
      }
      if (result.status) {
        setStatus(result.status);
      }
    });
  }

  async function handleDelete() {
    const confirmed = await confirm({
      title: `Delete ${state.title || "this estimate"}?`,
      description:
        "This permanently removes the estimate and its line items. This can't be undone.",
      confirmLabel: "Delete estimate",
      variant: "destructive",
    });

    if (!confirmed) {
      return;
    }

    startTransition(async () => {
      const result = await deleteEstimate(estimateId);

      if (result?.error) {
        setError(result.error);
      }
    });
  }

  function handleRestored(restoredState: EstimateBuilderState) {
    setState(restoredState);
    lastSavedStateRef.current = serializeState(restoredState);
    setSaveStatus("saved");
    setSavedAt(new Date().toISOString());
    void refreshVersions();
  }

  function handleGenerateProposal() {
    startTransition(async () => {
      const result = await createProposalFromEstimate(estimateId);
      if (result?.error) setError(result.error);
    });
  }

  function handlePrimaryAction() {
    switch (primaryAction.kind) {
      case "assemblies":
        setAssembliesOpen(true);
        break;
      case "copilot":
        setCopilotOpen(true);
        break;
      case "review":
        handleOpenReview();
        break;
      case "proposal":
        handleGenerateProposal();
        break;
      case "finalize":
        void handleFinalize();
        break;
      case "reopen":
        void handleReopen();
        break;
      default:
        break;
    }
  }

  function handleAiApplied(nextState: EstimateBuilderState, savedAt?: string) {
    setState(nextState);
    lastSavedStateRef.current = serializeState(nextState);
    setSaveStatus("saved");
    setSavedAt(savedAt ?? new Date().toISOString());
    void refreshVersions();
  }

  return (
    <div className="space-y-10">
      <EstimateWorkspaceHeader
        project={project}
        statusLabel={formatEstimateStatus(status)}
        title={state.title}
        isLocked={isLocked}
        onTitleChange={(value) => {
          setState((current) => ({ ...current, title: value }));
          markDirty();
        }}
        notes={state.notes}
        onNotesChange={(value) => {
          setState((current) => ({ ...current, notes: value }));
          markDirty();
        }}
      />

      <EstimateWorkspaceToolbar
        primaryAction={primaryAction}
        onPrimaryAction={handlePrimaryAction}
        reviewLoading={reviewLoading}
        pending={pending}
        saveStatus={saveStatus}
        savedAt={savedAt}
        onOpenAssemblies={() => setAssembliesOpen(true)}
        onOpenOverflow={() => setOverflowOpen(true)}
        showFinalize={showFinalizeSecondary}
        onFinalize={() => void handleFinalize()}
      />

      {estimateCopilotEnabled && copilotOpen ? (
        <EstimateCopilotPanel
          open={copilotOpen}
          onClose={() => setCopilotOpen(false)}
          estimateId={estimateId}
          state={state}
          context={reviewContext}
          disabled={isLocked}
          onApplied={handleAiApplied}
        />
      ) : null}

      {!estimateCopilotEnabled && reviewOpen ? (
        <AIReviewPanel
          open={reviewOpen}
          result={reviewResult}
          loading={reviewLoading}
          error={reviewError}
          onClose={() => setReviewOpen(false)}
          onRefresh={handleRefreshReview}
          onAddMaterial={handleReviewAddMaterial}
          onUpdateLabor={handleReviewUpdateLabor}
          onUpdateUnit={handleReviewUpdateUnit}
          onIncreaseMarkup={handleReviewIncreaseMarkup}
        />
      ) : null}

      {!estimateCopilotEnabled && assistantOpen ? (
        <EstimateAssistantPanel
          open={assistantOpen}
          onClose={() => setAssistantOpen(false)}
          estimateId={estimateId}
          currentState={state}
          context={reviewContext}
          onApplyRecommendations={handleAiApplied}
          onVersionsRefresh={refreshVersions}
        />
      ) : null}

      {historyOpen ? (
        <EstimateVersionHistory
          open={historyOpen}
          estimateId={estimateId}
          versions={versions}
          onClose={() => setHistoryOpen(false)}
          onRestored={handleRestored}
        />
      ) : null}

      <EstimateTemplatesDialog
        open={templatesOpen}
        onClose={() => setTemplatesOpen(false)}
        currentState={state}
        onApply={(nextState) => {
          setState(nextState);
          lastSavedStateRef.current = serializeState(nextState);
          setSaveStatus("idle");
          markDirty();
        }}
      />

      <EstimateBuilderOverflowMenu
        open={overflowOpen}
        onClose={() => setOverflowOpen(false)}
        status={status}
        pending={pending}
        onSave={handleSave}
        onTemplates={() => setTemplatesOpen(true)}
        onHistory={() => setHistoryOpen(true)}
        onShortcuts={() => setShortcutsOpen(true)}
        onGenerateProposal={handleGenerateProposal}
        onFinalize={() => void handleFinalize()}
        onReopen={() => void handleReopen()}
        onDuplicate={handleDuplicate}
        onDelete={() => void handleDelete()}
        onAssistant={() => setAssistantOpen(true)}
        showAssistant={!estimateCopilotEnabled}
      />

      <Modal
        open={assembliesOpen}
        onClose={() => setAssembliesOpen(false)}
        title="Assemblies library"
        description="Insert pre-built scope into your estimate."
        size="xl"
      >
        <div className="max-h-[min(70vh,640px)] overflow-y-auto pr-1">
          <AssembliesLibraryPanel
            onInsert={(assembly) => {
              insertAssembly(assembly);
              setAssembliesOpen(false);
            }}
          />
        </div>
      </Modal>

      <Modal
        open={shortcutsOpen}
        onClose={() => setShortcutsOpen(false)}
        title="Keyboard shortcuts"
        size="md"
      >
        <ul className="space-y-2 text-sm">
          <li className="flex justify-between gap-4">
            <span>Save estimate</span>
            <kbd className="rounded border border-border bg-muted px-2 py-0.5 text-xs">
              ⌘/Ctrl + S
            </kbd>
          </li>
          <li className="flex justify-between gap-4">
            <span>Clear selection</span>
            <kbd className="rounded border border-border bg-muted px-2 py-0.5 text-xs">
              Esc
            </kbd>
          </li>
          <li className="flex justify-between gap-4">
            <span>Delete selected lines</span>
            <kbd className="rounded border border-border bg-muted px-2 py-0.5 text-xs">
              Delete
            </kbd>
          </li>
        </ul>
      </Modal>

      <BulkActionsToolbar
        selectedCount={selectedLineIds.size}
        onClearSelection={clearLineSelection}
        onDelete={bulkDeleteSelected}
        onMoveToCategory={bulkMoveSelected}
        onApplyMarkup={bulkApplyMarkup}
      />

      {error ? (
        <AlertBanner variant="error" title="Something went wrong">
          {error}
        </AlertBanner>
      ) : null}

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          {ESTIMATE_CATEGORIES.map((category) => (
            <EstimateSection
              key={category}
              category={category}
              label={ESTIMATE_CATEGORY_LABELS[category]}
              items={lineItemsByCategory[category]}
              selectedIds={selectedLineIds}
              onToggleSelect={toggleLineSelection}
              onToggleSelectAll={toggleSelectAllInSection}
              onAddRow={addLineItemHandlers[category]}
              onUpdateRow={updateLineItem}
              onApplyPickerSelection={(localId, selection, currentItem) =>
                applyPickerSelection(localId, selection, currentItem, category)
              }
              onDuplicateRow={duplicateLineItem}
              onRemoveRow={removeLineItem}
              onReorderRows={reorderHandlers[category]}
            />
          ))}
        </div>

        <div
          id="estimate-summary"
          className="xl:sticky xl:top-24 xl:self-start"
        >
          <EstimateSummary
            totals={totals}
            overheadPercent={state.overhead_percent}
            contingencyPercent={state.contingency_percent}
            profitMarginPercent={state.profit_margin_percent}
            taxPercent={state.tax_percent}
            onOverheadChange={(value) => {
              setState((current) => ({
                ...current,
                overhead_percent: value,
              }));
              markDirty();
            }}
            onContingencyChange={(value) => {
              setState((current) => ({
                ...current,
                contingency_percent: value,
              }));
              markDirty();
            }}
            onProfitMarginChange={(value) => {
              setState((current) => ({
                ...current,
                profit_margin_percent: value,
              }));
              markDirty();
            }}
            onTaxChange={(value) => {
              setState((current) => ({
                ...current,
                tax_percent: value,
              }));
              markDirty();
            }}
          />
        </div>
      </div>

      <EstimateLessonsCompact guidance={guidance} />

      {!estimateCopilotEnabled ? (
        <EstimateAiInsightsCompact
          state={state}
          context={reviewContext}
          loading={reviewLoading}
          disabled={isLocked}
          onOpenFullReview={handleOpenReview}
          onApplyMarkup={applyProfitMargin}
        />
      ) : null}
    </div>
  );
}
