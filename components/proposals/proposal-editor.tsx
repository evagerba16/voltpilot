"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";

import {
  archiveProposal,
  autosaveProposal,
  deleteProposal,
  duplicateProposal,
  markProposalAcceptedManually,
  saveProposal,
  updateProposalBranding,
} from "@/app/(dashboard)/proposals/actions";
import {
  AiProposalReviewCard,
} from "@/components/proposals/ai-proposal-review-card";
import { ProposalAcceptedHandoff } from "@/components/proposals/proposal-accepted-handoff";
import { buildAcceptanceNextSteps } from "@/lib/proposals/acceptance-next-steps";
import { ProposalActivityTimeline } from "@/components/proposals/proposal-activity-timeline";
import { ProposalAiInsightsCompact } from "@/components/proposals/proposal-ai-insights-compact";
import { ProposalAnalyticsPanel } from "@/components/proposals/proposal-analytics-panel";
import { ProposalBuilderOverflowMenu } from "@/components/proposals/proposal-builder-overflow-menu";
import { ProposalMediaEditor } from "@/components/proposals/proposal-media-editor";
import { ProposalPreview } from "@/components/proposals/proposal-preview";
import { ProposalSendDialog } from "@/components/proposals/proposal-send-dialog";
import { ProposalSignaturePanel } from "@/components/proposals/proposal-signature-panel";
import {
  ProposalWorkflowPanel,
} from "@/components/proposals/proposal-workflow-panel";
import {
  ProposalWorkspaceHeader,
  ProposalWorkspacePriceContext,
  ProposalWorkspaceToolbar,
} from "@/components/proposals/proposal-workspace-header";
import {
  ProposalAssistantPanel,
} from "@/components/ai/proposal-assistant-panel";
import { useConfirm } from "@/components/ui/confirm-provider";
import { useToast } from "@/components/ui/toast-provider";
import { mapProposalToEditorState } from "@/lib/proposals/build-from-estimate";
import { formatCurrency } from "@/lib/proposals/format";
import { resolveProposalPrimaryAction } from "@/lib/proposals/primary-action";
import { reviewProposal } from "@/lib/ai/proposal-review";
import type { ProposalInsightWithAction, ProposalProfile } from "@/lib/proposals/profile-types";
import {
  isProposalLocked,
  PROPOSAL_LOCKED_MESSAGE,
} from "@/lib/proposals/proposal-lock";
import {
  PROPOSAL_AUTOSAVE_DEBOUNCE_MS,
  type ProposalCompanySnapshot,
  type ProposalEditorState,
  type ProposalEstimateSnapshot,
  type ProposalMediaItem,
  type ProposalWithRelations,
} from "@/lib/proposals/types";
import { useKeyboardShortcut } from "@/lib/hooks/use-keyboard-shortcut";
import { usePermissions } from "@/lib/hooks/use-permissions";

type ProposalEditorProps = {
  proposal: ProposalWithRelations;
  media: ProposalMediaItem[];
  profile: ProposalProfile;
  insights: ProposalInsightWithAction[];
};

type SaveStatus = "idle" | "saving" | "saved" | "error";
type EditorMode = "edit" | "preview";

const inputClassName =
  "h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

const textareaClassName =
  "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

const labelClassName = "text-sm font-medium";

function serializeState(state: ProposalEditorState) {
  return JSON.stringify(state);
}

export function ProposalEditor({
  proposal,
  media,
  profile,
  insights,
}: ProposalEditorProps) {
  const router = useRouter();
  const { can } = usePermissions();
  const locked = isProposalLocked(proposal.status);
  const canEdit = can("proposals.edit") && !locked;
  const [state, setState] = useState(() => mapProposalToEditorState(proposal));
  const [branding, setBranding] = useState({
    customerLogoUrl: proposal.customer_logo_url ?? "",
    brandPrimaryColor: proposal.brand_primary_color ?? "",
    brandAccentColor: proposal.brand_accent_color ?? "",
  });
  const [mediaItems, setMediaItems] = useState(media);
  const [mode, setMode] = useState<EditorMode>(locked ? "preview" : "edit");
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [savedAt, setSavedAt] = useState<string | null>(proposal.last_autosaved_at);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [workflowOpen, setWorkflowOpen] = useState(false);
  const [overflowOpen, setOverflowOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const confirm = useConfirm();
  const toast = useToast();

  const lastSavedStateRef = useRef(serializeState(state));
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSavingRef = useRef(false);

  const company: ProposalCompanySnapshot =
    proposal.company_snapshot ?? {
      company_name: "Your Company",
      company_logo_url: null,
      address_lines: [],
      phone: null,
      email: null,
      website: null,
      license_number: null,
    };

  const estimateSnapshot = proposal.estimate_snapshot as ProposalEstimateSnapshot | null;

  const reviewResult = useMemo(() => reviewProposal(state), [state]);

  const primaryAction = useMemo(
    () =>
      resolveProposalPrimaryAction({
        status: proposal.status,
        canEdit,
        readyToSend: reviewResult.readyToSend,
      }),
    [proposal.status, canEdit, reviewResult.readyToSend]
  );

  const grossMarginLabel =
    estimateSnapshot?.gross_margin_percent && estimateSnapshot.gross_margin_percent > 0
      ? `${estimateSnapshot.gross_margin_percent.toFixed(1)}%`
      : "—";

  const isAccepted = proposal.status === "Accepted";

  const canMarkAccepted =
    can("proposals.edit") &&
    (proposal.status === "Sent" || proposal.status === "Viewed");

  const acceptanceNextSteps = useMemo(
    () =>
      buildAcceptanceNextSteps({
        projectId: proposal.project.id,
        projectType: proposal.project.project_type,
        hasGeneralContractor: Boolean(proposal.project.general_contractor),
        estimateSnapshot,
        grossMarginPercent: estimateSnapshot?.gross_margin_percent ?? null,
      }),
    [
      proposal.project.id,
      proposal.project.project_type,
      proposal.project.general_contractor,
      estimateSnapshot,
    ]
  );

  function handlePrimaryAction() {
    switch (primaryAction.kind) {
      case "send":
      case "follow_up":
        setSendOpen(true);
        break;
      case "manage_job":
        router.push(`/projects/${proposal.project.id}?tab=job-costing`);
        break;
      case "preview":
        setMode("preview");
        break;
      case "workflow":
        setWorkflowOpen(true);
        break;
    }
  }

  function handleBrandingChange(next: typeof branding) {
    setBranding(next);
    void updateProposalBranding(proposal.id, next);
  }

  function updateField<K extends keyof ProposalEditorState>(
    field: K,
    value: ProposalEditorState[K]
  ) {
    setState((current) => ({ ...current, [field]: value }));
    setSaveStatus("idle");
  }

  function focusProposalField(field: keyof ProposalEditorState) {
    setMode("edit");
    window.requestAnimationFrame(() => {
      const element = document.getElementById(field);
      element?.scrollIntoView({ behavior: "smooth", block: "center" });
      if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
        element.focus();
      }
    });
  }

  const runAutosave = useCallback(
    async (currentState: ProposalEditorState) => {
      if (!canEdit || isSavingRef.current) return;

      const serialized = serializeState(currentState);
      if (serialized === lastSavedStateRef.current) return;

      isSavingRef.current = true;
      setSaveStatus("saving");

      const result = await autosaveProposal(proposal.id, currentState);
      isSavingRef.current = false;

      if (result.error) {
        setSaveStatus("error");
        return;
      }

      lastSavedStateRef.current = serialized;
      setSavedAt(result.savedAt ?? new Date().toISOString());
      setSaveStatus("saved");
    },
    [proposal.id, canEdit]
  );

  useEffect(() => {
    if (!canEdit) return;

    const serialized = serializeState(state);
    if (serialized === lastSavedStateRef.current) return;

    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);

    autosaveTimerRef.current = setTimeout(() => {
      void runAutosave(state);
    }, PROPOSAL_AUTOSAVE_DEBOUNCE_MS);

    return () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    };
  }, [state, runAutosave, canEdit]);

  function handleSave() {
    if (!canEdit) return;

    setError(null);
    startTransition(async () => {
      setSaveStatus("saving");
      const result = await saveProposal(proposal.id, state);

      if (result.error) {
        setError(result.error);
        setSaveStatus("error");
        return;
      }

      lastSavedStateRef.current = serializeState(state);
      setSavedAt(result.savedAt ?? new Date().toISOString());
      setSaveStatus("saved");
      toast.success(`${state.title || proposal.title} was saved.`);
    });
  }

  useKeyboardShortcut({ key: "s", metaOrCtrl: true }, handleSave, { enabled: canEdit });

  async function handleDelete() {
    if (!canEdit) return;

    const confirmed = await confirm({
      title: `Delete ${proposal.title}?`,
      description: "This proposal will be permanently removed. This can't be undone.",
      confirmLabel: "Delete proposal",
      variant: "destructive",
    });

    if (!confirmed) {
      return;
    }

    startTransition(async () => {
      const result = await deleteProposal(proposal.id);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success(`${proposal.title} was deleted.`);
    });
  }

  function handleArchive() {
    if (!canEdit) return;

    startTransition(async () => {
      const result = await archiveProposal(proposal.id);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success(`${proposal.title} was archived.`);
    });
  }

  async function handleMarkAccepted() {
    if (!canMarkAccepted) return;

    const confirmed = await confirm({
      title: "Mark proposal as accepted?",
      description: `Record that ${proposal.project.customer.company_name} accepted this bid outside the portal. The project will move to Awarded and you can start job costing.`,
      confirmLabel: "Mark as accepted",
      variant: "default",
    });

    if (!confirmed) {
      return;
    }

    startTransition(async () => {
      const result = await markProposalAcceptedManually(proposal.id);

      if (result?.error) {
        toast.error(result.error);
        return;
      }

      toast.success("Proposal marked as accepted — project is now awarded.");
      router.refresh();
    });
  }

  function handleDuplicate() {
    if (!can("proposals.edit")) return;

    startTransition(async () => {
      const result = await duplicateProposal(proposal.id);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success(`${proposal.title} was duplicated.`);
    });
  }

  function handlePrint() {
    window.print();
  }

  function handleInsightAction(insight: ProposalInsightWithAction) {
    if (insight.onActionField === "send") {
      setSendOpen(true);
      return;
    }

    if (insight.onActionField === "workflow") {
      setWorkflowOpen(true);
      return;
    }

    setMode("edit");
  }

  return (
    <div className="space-y-6">
      <ProposalWorkspaceHeader
        status={proposal.status}
        proposalNumber={proposal.proposal_number}
        title={state.title}
        isLocked={locked}
        onTitleChange={(value) => updateField("title", value)}
        project={proposal.project}
        estimateTitle={proposal.estimate?.title ?? null}
        branding={branding}
        onBrandingChange={handleBrandingChange}
      />

      <ProposalWorkspaceToolbar
        primaryAction={primaryAction}
        onPrimaryAction={handlePrimaryAction}
        pending={pending}
        canEdit={canEdit}
        mode={mode}
        onModeChange={setMode}
        saveStatus={saveStatus}
        savedAt={savedAt}
        onOpenOverflow={() => setOverflowOpen(true)}
      />

      {!isAccepted ? (
        <ProposalWorkspacePriceContext
          amount={formatCurrency(proposal.amount)}
          grossMarginPercent={grossMarginLabel}
        />
      ) : null}

      {isAccepted ? (
        <ProposalAcceptedHandoff
          customerName={proposal.project.customer.company_name}
          contactName={proposal.project.customer.contact_name}
          projectName={proposal.project.project_name}
          projectType={proposal.project.project_type}
          projectAddress={proposal.project.project_address}
          amount={proposal.amount}
          grossMarginPercent={estimateSnapshot?.gross_margin_percent ?? null}
          acceptedAt={proposal.accepted_at}
          signerName={proposal.customer_signed_name}
          nextSteps={acceptanceNextSteps}
        />
      ) : null}

      {!isAccepted ? (
        <ProposalAiInsightsCompact
          insights={insights}
          projectId={proposal.project.id}
          customerId={proposal.project.customer.id}
          proposalTitle={state.title || proposal.title}
          onAction={handleInsightAction}
        />
      ) : null}

      {error ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {locked && !isAccepted ? (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
          {PROPOSAL_LOCKED_MESSAGE}
        </p>
      ) : null}

      {isAccepted ? (
        <details className="group rounded-2xl border border-border bg-card shadow-sm">
          <summary className="cursor-pointer list-none px-6 py-4 text-sm font-semibold marker:content-none [&::-webkit-details-marker]:hidden">
            View signed proposal
          </summary>
          <div className="border-t border-border p-4 sm:p-6">
            <ProposalPreview
              proposal={{
                ...proposal,
                title: state.title,
                amount: proposal.amount,
                customer_logo_url: branding.customerLogoUrl || null,
                brand_primary_color: branding.brandPrimaryColor || null,
                brand_accent_color: branding.brandAccentColor || null,
              }}
              content={state}
              company={company}
              estimateSnapshot={estimateSnapshot}
              media={mediaItems}
              customerSignatureData={proposal.customer_signature_data}
              customerSignedAt={proposal.accepted_at}
            />
          </div>
        </details>
      ) : mode === "preview" || !canEdit ? (
        <ProposalPreview
          proposal={{
            ...proposal,
            title: state.title,
            amount: proposal.amount,
            customer_logo_url: branding.customerLogoUrl || null,
            brand_primary_color: branding.brandPrimaryColor || null,
            brand_accent_color: branding.brandAccentColor || null,
          }}
          content={state}
          company={company}
          estimateSnapshot={estimateSnapshot}
          media={mediaItems}
          customerSignatureData={proposal.customer_signature_data}
          customerSignedAt={proposal.customer_signed_at}
        />
      ) : (
        <div className="grid gap-6 xl:grid-cols-2">
          <fieldset
            disabled={!canEdit}
            className="space-y-4 rounded-xl border border-border bg-card p-5 shadow-sm"
          >
            <h2 className="text-base font-semibold">Proposal content</h2>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="proposal_date" className={labelClassName}>
                  Proposal date
                </label>
                <input
                  id="proposal_date"
                  type="date"
                  value={state.proposal_date}
                  onChange={(e) => updateField("proposal_date", e.target.value)}
                  className={inputClassName}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="expiration_date" className={labelClassName}>
                  Expiration date
                </label>
                <input
                  id="expiration_date"
                  type="date"
                  value={state.expiration_date}
                  onChange={(e) => updateField("expiration_date", e.target.value)}
                  className={inputClassName}
                />
              </div>
              <div className="flex items-end sm:col-span-2">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={state.show_line_item_breakdown}
                    onChange={(e) =>
                      updateField("show_line_item_breakdown", e.target.checked)
                    }
                  />
                  Include optional line item breakdown
                </label>
              </div>
            </div>

            {(
              [
                ["scope_of_work", "Scope of work"],
                ["materials_summary", "Included materials"],
                ["labor_summary", "Labor summary"],
                ["equipment_summary", "Equipment summary"],
                ["assumptions", "Assumptions"],
                ["exclusions", "Exclusions"],
                ["terms_and_conditions", "Terms & conditions"],
                ["warranty_information", "Warranty information"],
                ["notes", "Customer-facing notes"],
              ] as const
            ).map(([field, label]) => (
              <div key={field} className="space-y-2">
                <label htmlFor={field} className={labelClassName}>
                  {label}
                </label>
                <textarea
                  id={field}
                  rows={field === "scope_of_work" ? 5 : 4}
                  value={state[field]}
                  onChange={(e) => updateField(field, e.target.value)}
                  className={textareaClassName}
                />
              </div>
            ))}

            <details className="group rounded-xl border border-border/60 bg-muted/10">
              <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-muted-foreground marker:content-none [&::-webkit-details-marker]:hidden">
                Internal notes & signatures
              </summary>
              <div className="space-y-4 border-t border-border/60 px-4 pb-4 pt-3">
                <div className="space-y-2">
                  <label htmlFor="internal_notes" className={labelClassName}>
                    Internal notes (not shown to customer)
                  </label>
                  <textarea
                    id="internal_notes"
                    rows={3}
                    value={state.internal_notes}
                    onChange={(e) => updateField("internal_notes", e.target.value)}
                    className={textareaClassName}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label htmlFor="customer_signature_name" className={labelClassName}>
                      Customer signature name
                    </label>
                    <input
                      id="customer_signature_name"
                      value={state.customer_signature_name}
                      onChange={(e) =>
                        updateField("customer_signature_name", e.target.value)
                      }
                      className={inputClassName}
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="customer_signature_title" className={labelClassName}>
                      Customer signature title
                    </label>
                    <input
                      id="customer_signature_title"
                      value={state.customer_signature_title}
                      onChange={(e) =>
                        updateField("customer_signature_title", e.target.value)
                      }
                      className={inputClassName}
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="contractor_signature_name" className={labelClassName}>
                      Contractor signature name
                    </label>
                    <input
                      id="contractor_signature_name"
                      value={state.contractor_signature_name}
                      onChange={(e) =>
                        updateField("contractor_signature_name", e.target.value)
                      }
                      className={inputClassName}
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="contractor_signature_title" className={labelClassName}>
                      Contractor signature title
                    </label>
                    <input
                      id="contractor_signature_title"
                      value={state.contractor_signature_title}
                      onChange={(e) =>
                        updateField("contractor_signature_title", e.target.value)
                      }
                      className={inputClassName}
                    />
                  </div>
                </div>
              </div>
            </details>

            <ProposalMediaEditor
              proposalId={proposal.id}
              initialMedia={media}
              onMediaChange={setMediaItems}
              readOnly={!canEdit}
            />
          </fieldset>

          <div className="xl:sticky xl:top-24 xl:self-start">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold">Live preview</h2>
              <span className="text-xs text-muted-foreground">Customer-facing preview</span>
            </div>
            <div className="max-h-[calc(100vh-8rem)] overflow-y-auto rounded-xl border border-border bg-muted/20 p-4">
              <ProposalPreview
                proposal={{
                  ...proposal,
                  title: state.title,
                  amount: proposal.amount,
                  customer_logo_url: branding.customerLogoUrl || null,
                  brand_primary_color: branding.brandPrimaryColor || null,
                  brand_accent_color: branding.brandAccentColor || null,
                }}
                content={{
                  ...state,
                  internal_notes: "",
                }}
                company={company}
                estimateSnapshot={estimateSnapshot}
                media={mediaItems}
                customerSignatureData={proposal.customer_signature_data}
                customerSignedAt={proposal.customer_signed_at}
              />
            </div>
          </div>
        </div>
      )}

      <details className="group rounded-2xl border border-border bg-card shadow-sm">
        <summary className="cursor-pointer list-none px-6 py-4 text-sm font-semibold marker:content-none [&::-webkit-details-marker]:hidden">
          Customer engagement
        </summary>
        <div className="space-y-6 border-t border-border px-6 py-6">
          <ProposalAnalyticsPanel detail={profile.analytics} />
          <ProposalSignaturePanel
            proposal={proposal}
            viewCount={profile.analytics.viewCount}
          />
          <ProposalActivityTimeline events={profile.activity} />
        </div>
      </details>

      {canEdit && insights.length === 0 ? (
        <details className="group rounded-2xl border border-border bg-card shadow-sm">
          <summary className="cursor-pointer list-none px-6 py-4 text-sm font-semibold marker:content-none [&::-webkit-details-marker]:hidden">
            Readiness review
          </summary>
          <div className="border-t border-border px-6 py-6">
            <AiProposalReviewCard state={state} onFocusField={focusProposalField} />
          </div>
        </details>
      ) : null}

      <ProposalBuilderOverflowMenu
        open={overflowOpen}
        onClose={() => setOverflowOpen(false)}
        pending={pending}
        canEdit={canEdit}
        projectHref={`/projects/${proposal.project.id}`}
        estimateHref={proposal.estimate ? `/estimates/${proposal.estimate.id}` : null}
        portalHref={proposal.public_token ? `/p/${proposal.public_token}` : null}
        pdfHref={`/proposals/${proposal.id}/pdf`}
        onSave={handleSave}
        onAssistant={() => setAssistantOpen(true)}
        onWorkflow={() => setWorkflowOpen(true)}
        onPrint={handlePrint}
        onDuplicate={handleDuplicate}
        onArchive={handleArchive}
        onDelete={handleDelete}
        canMarkAccepted={canMarkAccepted}
        onMarkAccepted={handleMarkAccepted}
      />

      <ProposalAssistantPanel
        open={assistantOpen && canEdit}
        onClose={() => setAssistantOpen(false)}
        currentState={state}
        context={{
          projectName: proposal.project.project_name,
          customerName: proposal.project.customer.company_name,
          companyName: company.company_name,
          estimateSnapshot: estimateSnapshot,
        }}
        onApplySuggestion={(field, content) => {
          updateField(field, content);
        }}
      />

      <ProposalSendDialog
        open={sendOpen}
        onClose={() => setSendOpen(false)}
        proposalId={proposal.id}
        proposalTitle={state.title || proposal.title}
        proposalContent={state}
      />

      <ProposalWorkflowPanel
        open={workflowOpen}
        onClose={() => setWorkflowOpen(false)}
        proposalId={proposal.id}
        proposalTitle={state.title || proposal.title}
        readOnly={!canEdit}
        onRestored={(restoredState) => {
          setState(restoredState);
          lastSavedStateRef.current = serializeState(restoredState);
          setSaveStatus("saved");
        }}
      />
    </div>
  );
}
