"use client";

import Link from "next/link";
import {
  Archive,
  CheckCircle2,
  Copy,
  Download,
  ExternalLink,
  FolderKanban,
  Printer,
  Save,
  Sparkles,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/utils";

type ProposalBuilderOverflowMenuProps = {
  open: boolean;
  onClose: () => void;
  pending?: boolean;
  canEdit: boolean;
  projectHref: string;
  estimateHref: string | null;
  portalHref: string | null;
  pdfHref: string;
  onSave: () => void;
  onAssistant: () => void;
  onWorkflow: () => void;
  onPrint: () => void;
  onDuplicate: () => void;
  onArchive: () => void;
  onDelete: () => void;
  canMarkAccepted?: boolean;
  onMarkAccepted?: () => void;
};

export function ProposalBuilderOverflowMenu({
  open,
  onClose,
  pending = false,
  canEdit,
  projectHref,
  estimateHref,
  portalHref,
  pdfHref,
  onSave,
  onAssistant,
  onWorkflow,
  onPrint,
  onDuplicate,
  onArchive,
  onDelete,
  canMarkAccepted = false,
  onMarkAccepted,
}: ProposalBuilderOverflowMenuProps) {
  function run(action: () => void) {
    action();
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="More actions" size="sm">
      <ul className="space-y-1">
        {canEdit ? (
          <li>
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={() => run(onSave)}
              disabled={pending}
            >
              <Save data-icon="inline-start" />
              Save proposal
            </Button>
          </li>
        ) : null}
        {canEdit ? (
          <li>
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={() => run(onAssistant)}
              disabled={pending}
            >
              <Sparkles data-icon="inline-start" />
              Writing assistant
            </Button>
          </li>
        ) : null}
        <li>
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={() => run(onWorkflow)}
            disabled={pending}
          >
            Version history & workflow
          </Button>
        </li>
        <li className="my-2 border-t border-border" />
        {canMarkAccepted && onMarkAccepted ? (
          <li>
            <Button
              variant="ghost"
              className="w-full justify-start text-emerald-700 hover:text-emerald-700 dark:text-emerald-400"
              onClick={() => run(onMarkAccepted)}
              disabled={pending}
            >
              <CheckCircle2 data-icon="inline-start" />
              Mark as accepted
            </Button>
          </li>
        ) : null}
        <li>
          <Link
            href={projectHref}
            className={cn(buttonVariants({ variant: "ghost" }), "w-full justify-start")}
          >
            <FolderKanban data-icon="inline-start" />
            View project
          </Link>
        </li>
        {estimateHref ? (
          <li>
            <Link
              href={estimateHref}
              className={cn(buttonVariants({ variant: "ghost" }), "w-full justify-start")}
            >
              View estimate
            </Link>
          </li>
        ) : null}
        {portalHref ? (
          <li>
            <Link
              href={portalHref}
              target="_blank"
              className={cn(buttonVariants({ variant: "ghost" }), "w-full justify-start")}
            >
              <ExternalLink data-icon="inline-start" />
              Customer portal
            </Link>
          </li>
        ) : null}
        <li>
          <a
            href={pdfHref}
            target="_blank"
            rel="noreferrer"
            className={cn(buttonVariants({ variant: "ghost" }), "w-full justify-start")}
          >
            <Download data-icon="inline-start" />
            Download PDF
          </a>
        </li>
        <li>
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={() => run(onPrint)}
          >
            <Printer data-icon="inline-start" />
            Print
          </Button>
        </li>
        <li>
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={() => run(onDuplicate)}
            disabled={pending}
          >
            <Copy data-icon="inline-start" />
            Duplicate
          </Button>
        </li>
        {canEdit ? (
          <>
            <li className="my-2 border-t border-border" />
            <li>
              <Button
                variant="ghost"
                className="w-full justify-start"
                onClick={() => run(onArchive)}
                disabled={pending}
              >
                <Archive data-icon="inline-start" />
                Archive
              </Button>
            </li>
            <li>
              <Button
                variant="ghost"
                className="w-full justify-start text-destructive hover:text-destructive"
                onClick={() => run(onDelete)}
                disabled={pending}
              >
                <Trash2 data-icon="inline-start" />
                Delete proposal
              </Button>
            </li>
          </>
        ) : null}
      </ul>
    </Modal>
  );
}
