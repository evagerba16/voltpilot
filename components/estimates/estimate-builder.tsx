"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { ArrowLeft, Copy, FileText, Keyboard, Lock, LockOpen, Save } from "lucide-react";

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
import {
  AiReviewButton,
} from "@/components/estimates/AIReviewPanel";
import {
  buildLineItemFromSuggestion,
  type AiReviewRecommendation,
  type AiReviewResult,
} from "@/lib/ai/ai-review-service";
import {
  EstimateAssistantButton,
} from "@/components/ai/estimate-assistant-panel";
import { AiEstimateReviewCard } from "@/components/estimates/ai-estimate-review-card";
import { AssembliesLibraryPanel } from "@/components/estimates/assemblies-library-panel";
import { BulkActionsToolbar } from "@/components/estimates/bulk-actions-toolbar";
import { EstimateSection } from "@/components/estimates/estimate-section";
import type { LineItemPickerSelection } from "@/components/estimates/line-item-picker";
import {
  EstimateTemplatesButton,
  EstimateTemplatesDialog,
} from "@/components/estimates/estimate-templates-dialog";
import { EstimateSummary } from "@/components/estimates/estimate-summary";
import {
  EstimateVersionHistoryButton,
  SaveStatusIndicator,
} from "@/components/estimates/estimate-version-history";
import { Button } from "@/components/ui/button";
import { AlertBanner } from "@/components/ui/alert-banner";
import { useConfirm } from "@/components/ui/confirm-provider";
import { Modal } from "@/components/ui/modal";
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

const EstimateVersionHistory = dynamic(
  () =>
    import("@/components/estimates/estimate-version-history").then(
      (module) => module.EstimateVersionHistory
    ),
  { ssr: false }
);

type EstimateBuilderProps = {
  estimateId: string;
  initialState: EstimateBuilderState;
  initialStatus: EstimateStatus;
  initialVersions: EstimateVersion[];
  project: EstimateWithProject["project"];
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
}: EstimateBuilderProps) {
  const [state, setState] = useState(initialState);
  const [status, setStatus] = useState<EstimateStatus>(initialStatus);
  const [versions, setVersions] = useState(initialVersions);
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [reviewResult, setReviewResult] = useState<AiReviewResult | null>(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
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

  function handleAiApplied(nextState: EstimateBuilderState, savedAt?: string) {
    setState(nextState);
    lastSavedStateRef.current = serializeState(nextState);
    setSaveStatus("saved");
    setSavedAt(savedAt ?? new Date().toISOString());
    void refreshVersions();
  }

  return (
    <div className="space-y-6">
      <div className="sticky top-0 z-20 -mx-4 border-b border-border bg-background/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Final selling price
            </p>
            <p className="text-2xl font-bold tabular-nums tracking-tight">
              {formatCurrency(totals.finalSellingPrice)}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Labor</p>
              <p className="font-medium tabular-nums">
                {formatCurrency(totals.laborTotal)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Materials</p>
              <p className="font-medium tabular-nums">
                {formatCurrency(totals.materialsTotal)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Equipment</p>
              <p className="font-medium tabular-nums">
                {formatCurrency(totals.equipmentTotal)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Subcontractors</p>
              <p className="font-medium tabular-nums">
                {formatCurrency(totals.subcontractorsTotal)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Direct cost</p>
              <p className="font-medium tabular-nums">
                {formatCurrency(totals.directCost)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Overhead</p>
              <p className="font-medium tabular-nums">
                {formatCurrency(totals.overheadAmount)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Profit</p>
              <p className="font-medium tabular-nums">
                {formatCurrency(totals.profitAmount)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Gross margin</p>
              <p className="font-medium tabular-nums text-emerald-600 dark:text-emerald-400">
                {formatPercent(totals.grossMarginPercent)}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 shadow-sm lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-3">
          <Link
            href="/estimates"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Back to estimates
          </Link>

          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {project.customer.company_name}
            </p>
            <Link
              href={`/projects/${project.id}`}
              className="text-sm font-medium text-primary hover:underline"
            >
              {project.project_name}
            </Link>
            {project.project_address ? (
              <p className="text-sm text-muted-foreground">
                {project.project_address}
              </p>
            ) : null}
            <p className="mt-2 inline-flex rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium">
              {formatEstimateStatus(status)}
            </p>
          </div>

          {status === "Final" ? (
            <p className="text-sm text-muted-foreground">
              This estimate is marked final. Reopen it to edit line items or markups.
            </p>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <label htmlFor="estimate-title" className="text-sm font-medium">
                Estimate title
              </label>
              <input
                id="estimate-title"
                value={state.title}
                disabled={isLocked}
                onChange={(event) => {
                  setState((current) => ({
                    ...current,
                    title: event.target.value,
                  }));
                  markDirty();
                }}
                className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <label htmlFor="estimate-notes" className="text-sm font-medium">
                Notes
              </label>
              <textarea
                id="estimate-notes"
                rows={2}
                value={state.notes}
                onChange={(event) => {
                  setState((current) => ({
                    ...current,
                    notes: event.target.value,
                  }));
                  markDirty();
                }}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                placeholder="Assumptions, exclusions, or notes for your bid team"
              />
              <p className="text-xs text-muted-foreground">
                Optional — visible on proposals when you generate them from this estimate.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          <SaveStatusIndicator status={saveStatus} savedAt={savedAt} />
          <EstimateVersionHistoryButton
            onClick={() => setHistoryOpen(true)}
            versionCount={versions.length}
          />
          <AiReviewButton onClick={handleOpenReview} loading={reviewLoading} />
          <EstimateAssistantButton onClick={() => setAssistantOpen(true)} />
          <EstimateTemplatesButton onClick={() => setTemplatesOpen(true)} />
          <button
            type="button"
            onClick={() => setShortcutsOpen(true)}
            className="inline-flex size-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Keyboard shortcuts"
          >
            <Keyboard className="size-4" />
          </button>
          <Button variant="outline" onClick={handleGenerateProposal} disabled={pending}>
            <FileText data-icon="inline-start" />
            Add proposal
          </Button>
          {status === "Draft" ? (
            <Button variant="outline" onClick={handleFinalize} disabled={pending}>
              <Lock data-icon="inline-start" />
              Mark final
            </Button>
          ) : (
            <Button variant="outline" onClick={handleReopen} disabled={pending}>
              <LockOpen data-icon="inline-start" />
              Reopen
            </Button>
          )}
          <Button variant="outline" onClick={handleDuplicate} disabled={pending}>
            <Copy data-icon="inline-start" />
            Duplicate
          </Button>
          <Button variant="outline" onClick={handleDelete} disabled={pending}>
            Delete
          </Button>
          <Button onClick={handleSave} disabled={pending}>
            <Save data-icon="inline-start" />
            {pending ? "Saving..." : "Save estimate"}
          </Button>
        </div>
      </div>

      {reviewOpen ? (
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

      {assistantOpen ? (
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

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-4">
          <AiEstimateReviewCard
            state={state}
            context={reviewContext}
            loading={reviewLoading}
            disabled={isLocked}
            onOpenFullReview={handleOpenReview}
            onApplyMarkup={applyProfitMargin}
          />

          <AssembliesLibraryPanel onInsert={insertAssembly} />

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
    </div>
  );
}
