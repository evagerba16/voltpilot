"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import {
  Archive,
  ArrowLeft,
  Copy,
  Download,
  Eye,
  Pencil,
  Printer,
  Save,
  Send,
  Trash2,
} from "lucide-react";

import {
  archiveProposal,
  autosaveProposal,
  deleteProposal,
  duplicateProposal,
  saveProposal,
  updateProposalBranding,
} from "@/app/(dashboard)/proposals/actions";
import { ProposalMediaEditor } from "@/components/proposals/proposal-media-editor";
import { ProposalPreview } from "@/components/proposals/proposal-preview";
import { ProposalSendDialog } from "@/components/proposals/proposal-send-dialog";
import {
  ProposalWorkflowButton,
  ProposalWorkflowPanel,
} from "@/components/proposals/proposal-workflow-panel";
import {
  ProposalAssistantButton,
  ProposalAssistantPanel,
} from "@/components/ai/proposal-assistant-panel";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { useConfirm } from "@/components/ui/confirm-provider";
import { useToast } from "@/components/ui/toast-provider";
import { mapProposalToEditorState } from "@/lib/proposals/build-from-estimate";
import { formatCurrency, formatProposalStatus } from "@/lib/proposals/format";
import {
  isProposalLocked,
  PROPOSAL_LOCKED_MESSAGE,
} from "@/lib/proposals/proposal-lock";
import {
  PROPOSAL_AUTOSAVE_DEBOUNCE_MS,
  PROPOSAL_STATUS_STYLES,
  type ProposalCompanySnapshot,
  type ProposalEditorState,
  type ProposalEstimateSnapshot,
  type ProposalMediaItem,
  type ProposalWithRelations,
} from "@/lib/proposals/types";
import { cn } from "@/lib/utils";
import { useKeyboardShortcut } from "@/lib/hooks/use-keyboard-shortcut";
import { usePermissions } from "@/lib/hooks/use-permissions";

type ProposalEditorProps = {
  proposal: ProposalWithRelations;
  media: ProposalMediaItem[];
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

function SaveStatusIndicator({
  status,
  savedAt,
}: {
  status: SaveStatus;
  savedAt: string | null;
}) {
  if (status === "idle") return null;

  const label =
    status === "saving"
      ? "Saving..."
      : status === "saved"
        ? savedAt
          ? `Saved ${new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(new Date(savedAt))}`
          : "All changes saved"
        : "Couldn't save changes";

  return (
    <span
      className={cn(
        "text-sm",
        status === "error"
          ? "text-destructive"
          : status === "saving"
            ? "text-muted-foreground"
            : "text-emerald-600 dark:text-emerald-400"
      )}
    >
      {label}
    </span>
  );
}

export function ProposalEditor({ proposal, media }: ProposalEditorProps) {
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

  function updateField<K extends keyof ProposalEditorState>(
    field: K,
    value: ProposalEditorState[K]
  ) {
    setState((current) => ({ ...current, [field]: value }));
    setSaveStatus("idle");
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

  return (
    <div className="space-y-6">
      <div className="sticky top-0 z-20 -mx-4 border-b border-border bg-background/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
                  PROPOSAL_STATUS_STYLES[proposal.status]
                )}
              >
                {formatProposalStatus(proposal.status)}
              </span>
              <span className="text-sm text-muted-foreground">
                {proposal.proposal_number}
              </span>
            </div>
            <p className="mt-1 text-2xl font-bold tabular-nums">
              {formatCurrency(proposal.amount)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/projects/${proposal.project.id}`}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              View project
            </Link>
            {proposal.estimate ? (
              <Link
                href={`/estimates/${proposal.estimate.id}`}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                View estimate
              </Link>
            ) : null}
            {proposal.public_token ? (
              <Link
                href={`/p/${proposal.public_token}`}
                target="_blank"
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                Customer portal
              </Link>
            ) : null}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 shadow-sm lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <Link
            href="/proposals"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Back to proposals
          </Link>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {proposal.project.customer.company_name}
            </p>
            <p className="text-lg font-semibold">{proposal.project.project_name}</p>
            <p className="text-sm text-muted-foreground">
              From estimate: {proposal.estimate?.title ?? "None linked"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canEdit ? (
            <SaveStatusIndicator status={saveStatus} savedAt={savedAt} />
          ) : null}
          <div className="flex rounded-lg border border-border p-0.5">
            {canEdit ? (
              <button
                type="button"
                onClick={() => setMode("edit")}
                className={cn(
                  buttonVariants({ variant: "ghost", size: "sm" }),
                  mode === "edit" && "bg-muted text-foreground"
                )}
              >
                <Pencil className="size-3.5" />
                Edit
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setMode("preview")}
              className={cn(
                buttonVariants({ variant: "ghost", size: "sm" }),
                mode === "preview" && "bg-muted text-foreground"
              )}
            >
              <Eye className="size-3.5" />
              Preview
            </button>
          </div>
          <ProposalWorkflowButton onClick={() => setWorkflowOpen(true)} />
          {canEdit ? (
            <ProposalAssistantButton onClick={() => setAssistantOpen(true)} />
          ) : null}
          {can("proposals.edit") ? (
            <Button variant="outline" onClick={() => setSendOpen(true)}>
              <Send data-icon="inline-start" />
              Send
            </Button>
          ) : null}
          <a
            href={`/proposals/${proposal.id}/pdf`}
            target="_blank"
            className={buttonVariants({ variant: "outline" })}
          >
            <Download data-icon="inline-start" />
            PDF
          </a>
          <Button variant="outline" onClick={handlePrint}>
            <Printer data-icon="inline-start" />
            Print
          </Button>
          {can("proposals.edit") ? (
            <Button variant="outline" onClick={handleDuplicate} disabled={pending}>
              <Copy data-icon="inline-start" />
              Duplicate
            </Button>
          ) : null}
          {canEdit ? (
            <>
              <Button variant="outline" onClick={handleArchive} disabled={pending}>
                <Archive data-icon="inline-start" />
                Archive
              </Button>
              <Button variant="outline" onClick={handleDelete} disabled={pending}>
                <Trash2 data-icon="inline-start" />
                Delete
              </Button>
              <Button onClick={handleSave} disabled={pending}>
                <Save data-icon="inline-start" />
                {pending ? "Saving..." : "Save"}
              </Button>
            </>
          ) : null}
        </div>
      </div>

      {error ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {locked ? (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
          {PROPOSAL_LOCKED_MESSAGE}
        </p>
      ) : null}

      {mode === "preview" || !canEdit ? (
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
          <fieldset disabled={!canEdit} className="space-y-4 rounded-xl border border-border bg-card p-5 shadow-sm">
            <h2 className="text-base font-semibold">Proposal content</h2>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <label htmlFor="title" className={labelClassName}>
                  Proposal title
                </label>
                <input
                  id="title"
                  value={state.title}
                  onChange={(e) => updateField("title", e.target.value)}
                  className={inputClassName}
                  readOnly={!canEdit}
                  disabled={!canEdit}
                />
              </div>
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
              <div className="space-y-2 flex items-end sm:col-span-2">
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
                ["internal_notes", "Internal notes (not shown to customer)"],
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

            <div className="space-y-4 rounded-xl border border-border bg-muted/10 p-4">
              <h3 className="text-sm font-semibold">Branding</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <label htmlFor="customer_logo_url" className={labelClassName}>
                    Customer logo URL (optional)
                  </label>
                  <input
                    id="customer_logo_url"
                    value={branding.customerLogoUrl}
                    onChange={(event) =>
                      setBranding((current) => ({
                        ...current,
                        customerLogoUrl: event.target.value,
                      }))
                    }
                    onBlur={() => {
                      void updateProposalBranding(proposal.id, branding);
                    }}
                    className={inputClassName}
                    placeholder="https://..."
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="brand_primary_color" className={labelClassName}>
                    Primary color
                  </label>
                  <input
                    id="brand_primary_color"
                    type="color"
                    value={branding.brandPrimaryColor || "#1e3a5f"}
                    onChange={(event) => {
                      const value = event.target.value;
                      setBranding((current) => ({
                        ...current,
                        brandPrimaryColor: value,
                      }));
                      void updateProposalBranding(proposal.id, {
                        ...branding,
                        brandPrimaryColor: value,
                      });
                    }}
                    className="h-10 w-full rounded-lg border border-input bg-background px-1"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="brand_accent_color" className={labelClassName}>
                    Accent color
                  </label>
                  <input
                    id="brand_accent_color"
                    type="color"
                    value={branding.brandAccentColor || "#0ea5e9"}
                    onChange={(event) => {
                      const value = event.target.value;
                      setBranding((current) => ({
                        ...current,
                        brandAccentColor: value,
                      }));
                      void updateProposalBranding(proposal.id, {
                        ...branding,
                        brandAccentColor: value,
                      });
                    }}
                    className="h-10 w-full rounded-lg border border-input bg-background px-1"
                  />
                </div>
              </div>
            </div>

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
