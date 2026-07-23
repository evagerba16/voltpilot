"use client";

import { useEffect, useState, useTransition } from "react";
import { Copy, Send } from "lucide-react";

import {
  getProposalSendDefaults,
  sendProposalToCustomer,
} from "@/app/(dashboard)/proposals/actions";
import { AlertBanner } from "@/components/ui/alert-banner";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/toast-provider";
import { inputClassName, textareaClassName } from "@/lib/ui/form-classes";

type ProposalSendDialogProps = {
  open: boolean;
  proposalId: string;
  proposalTitle: string;
  onClose: () => void;
  onSent?: () => void;
};

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function ProposalSendDialog({
  open,
  proposalId,
  proposalTitle,
  onClose,
  onSent,
}: ProposalSendDialogProps) {
  const [recipientEmail, setRecipientEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [portalUrl, setPortalUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingDefaults, setLoadingDefaults] = useState(false);
  const [pending, startTransition] = useTransition();
  const { success, error: toastError } = useToast();

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setLoadingDefaults(true);
    setError(null);

    void getProposalSendDefaults(proposalId).then((result) => {
      if (cancelled) return;
      setLoadingDefaults(false);

      if ("error" in result && result.error) {
        setError(result.error);
        return;
      }

      if ("recipientEmail" in result) {
        setRecipientEmail(result.recipientEmail ?? "");
        setSubject(result.subject ?? "");
        setMessage(result.message ?? "");
        setPortalUrl(result.portalUrl ?? null);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [open, proposalId]);

  function handleSend() {
    setError(null);

    if (!recipientEmail.trim()) {
      setError("Enter the customer's email address.");
      return;
    }

    if (!isValidEmail(recipientEmail)) {
      setError("Enter a valid email address.");
      return;
    }

    startTransition(async () => {
      const result = await sendProposalToCustomer({
        proposalId,
        recipientEmail,
        subject,
        message,
      });

      if (result.error) {
        setError(result.error);
        return;
      }

      const title =
        "proposalTitle" in result && result.proposalTitle
          ? result.proposalTitle
          : proposalTitle;
      success(`${title} was sent.`);
      onSent?.();
      onClose();
    });
  }

  async function copyPortalUrl() {
    if (!portalUrl) return;

    try {
      await navigator.clipboard.writeText(portalUrl);
      success("Customer link copied.");
    } catch {
      toastError("We couldn't copy the link. Select it and copy manually.");
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Send ${proposalTitle}`}
      description="Email your customer a secure link to review, comment on, and accept this proposal."
      size="lg"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={pending || loadingDefaults}>
            <Send data-icon="inline-start" />
            {pending ? "Sending..." : "Send proposal"}
          </Button>
        </div>
      }
    >
      {loadingDefaults ? (
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
          <Spinner label="Loading send details" />
          <span>Loading email details...</span>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="send-recipient" className="text-sm font-medium">
              Customer email
            </label>
            <input
              id="send-recipient"
              type="email"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              className={inputClassName}
              autoComplete="email"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="send-subject" className="text-sm font-medium">
              Subject
            </label>
            <input
              id="send-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className={inputClassName}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="send-message" className="text-sm font-medium">
              Message
            </label>
            <textarea
              id="send-message"
              rows={6}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className={textareaClassName}
            />
          </div>
          {portalUrl ? (
            <div className="rounded-lg border border-dashed border-border bg-muted/20 p-3 text-sm">
              <p className="font-medium">Customer link</p>
              <p className="mt-1 break-all text-muted-foreground">{portalUrl}</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => void copyPortalUrl()}
              >
                <Copy data-icon="inline-start" />
                Copy link
              </Button>
            </div>
          ) : null}
        </div>
      )}

      {error ? (
        <AlertBanner variant="error" className="mt-4">
          {error}
        </AlertBanner>
      ) : null}
    </Modal>
  );
}
