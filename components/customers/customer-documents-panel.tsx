"use client";

import { useRef, useState, useTransition } from "react";
import { Download, FileText, Trash2, Upload } from "lucide-react";

import {
  deleteCustomerDocument,
  getCustomerDocumentDownloadUrl,
  uploadCustomerDocument,
} from "@/app/(dashboard)/customers/actions";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useConfirm } from "@/components/ui/confirm-provider";
import { useToast } from "@/components/ui/toast-provider";
import { formatFileSize } from "@/lib/customers/format";
import {
  CUSTOMER_DOCUMENT_ACCEPT,
  CUSTOMER_DOCUMENT_CATEGORIES,
  type CustomerDocument,
  type CustomerDocumentCategory,
} from "@/lib/customers/types";
import { cn } from "@/lib/utils";

type CustomerDocumentsPanelProps = {
  customerId: string;
  documents: CustomerDocument[];
  canEdit: boolean;
  formatTimestamp: (value: string) => string;
};

function categoryLabel(category: CustomerDocumentCategory) {
  return (
    CUSTOMER_DOCUMENT_CATEGORIES.find((option) => option.value === category)?.label ??
    "Other"
  );
}

export function CustomerDocumentsPanel({
  customerId,
  documents,
  canEdit,
  formatTimestamp,
}: CustomerDocumentsPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [category, setCategory] = useState<CustomerDocumentCategory>("contract");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const confirm = useConfirm();
  const { success, error: toastError } = useToast();

  function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    const formData = new FormData();
    formData.set("file", file);
    formData.set("category", category);

    startTransition(async () => {
      const result = await uploadCustomerDocument(customerId, formData);

      if (result.error) {
        setError(result.error);
        return;
      }

      success(`${file.name} uploaded.`);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    });
  }

  async function handleDownload(documentId: string) {
    startTransition(async () => {
      const result = await getCustomerDocumentDownloadUrl(customerId, documentId);

      if (result.error || !result.url) {
        toastError(result.error ?? "We couldn't open this document.");
        return;
      }

      window.open(result.url, "_blank", "noopener,noreferrer");
    });
  }

  async function handleDelete(documentId: string, fileName: string) {
    const confirmed = await confirm({
      title: `Delete ${fileName}?`,
      description: "This permanently removes the file from the customer record.",
      confirmLabel: "Delete document",
      variant: "destructive",
    });

    if (!confirmed) return;

    startTransition(async () => {
      const result = await deleteCustomerDocument(customerId, documentId);

      if (result.error) {
        toastError(result.error);
        return;
      }

      success("Document deleted.");
    });
  }

  return (
    <div id="documents" className="rounded-2xl border border-border bg-card shadow-sm">
      <div className="border-b border-border px-6 py-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-base font-semibold tracking-tight">Documents</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Contracts, photos, permits, warranties, blueprints, and inspection reports.
            </p>
          </div>
          {canEdit ? (
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={category}
                onChange={(event) =>
                  setCategory(event.target.value as CustomerDocumentCategory)
                }
                className="h-9 rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                aria-label="Document category"
              >
                {CUSTOMER_DOCUMENT_CATEGORIES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <input
                ref={inputRef}
                type="file"
                accept={CUSTOMER_DOCUMENT_ACCEPT}
                className="hidden"
                onChange={handleUpload}
              />
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                onClick={() => inputRef.current?.click()}
              >
                {pending ? (
                  <>
                    <Spinner className="mr-2 size-4" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload data-icon="inline-start" />
                    Upload file
                  </>
                )}
              </Button>
            </div>
          ) : null}
        </div>
      </div>

      <div className="space-y-3 p-6">
        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        {documents.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-muted/10 px-4 py-8 text-center">
            <FileText className="mx-auto size-8 text-muted-foreground/70" />
            <p className="mt-3 text-sm text-muted-foreground">
              No documents uploaded yet.
            </p>
          </div>
        ) : (
          documents.map((document, index) => (
            <div
              key={document.id}
              className={cn(
                "flex items-center gap-3 rounded-xl border border-border/80 bg-muted/10 p-4 transition-colors motion-safe:duration-200 hover:bg-muted/20",
                "motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300"
              )}
              style={{ animationDelay: `${index * 40}ms` }}
            >
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <FileText className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-sm font-medium">{document.file_name}</p>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    {categoryLabel(document.category ?? "other")}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(document.file_size)} · {formatTimestamp(document.created_at)}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleDownload(document.id)}
                  disabled={pending}
                  className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  aria-label={`Download ${document.file_name}`}
                >
                  <Download className="size-4" />
                </button>
                {canEdit ? (
                  <button
                    type="button"
                    onClick={() => handleDelete(document.id, document.file_name)}
                    disabled={pending}
                    className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                    aria-label={`Delete ${document.file_name}`}
                  >
                    <Trash2 className="size-4" />
                  </button>
                ) : null}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
