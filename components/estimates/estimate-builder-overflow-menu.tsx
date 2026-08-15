"use client";

import {
  Copy,
  FileText,
  Keyboard,
  Lock,
  LockOpen,
  Save,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import type { EstimateStatus } from "@/lib/estimates/types";

type EstimateBuilderOverflowMenuProps = {
  open: boolean;
  onClose: () => void;
  status: EstimateStatus;
  pending?: boolean;
  onSave: () => void;
  onTemplates: () => void;
  onHistory: () => void;
  onShortcuts: () => void;
  onGenerateProposal: () => void;
  onFinalize: () => void;
  onReopen: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onAssistant?: () => void;
  showAssistant?: boolean;
};

export function EstimateBuilderOverflowMenu({
  open,
  onClose,
  status,
  pending = false,
  onSave,
  onTemplates,
  onHistory,
  onShortcuts,
  onGenerateProposal,
  onFinalize,
  onReopen,
  onDuplicate,
  onDelete,
  onAssistant,
  showAssistant = false,
}: EstimateBuilderOverflowMenuProps) {
  function run(action: () => void) {
    action();
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="More actions" size="sm">
      <ul className="space-y-1">
        <li>
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={() => run(onSave)}
            disabled={pending}
          >
            <Save data-icon="inline-start" />
            Save estimate
          </Button>
        </li>
        <li>
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={() => run(onTemplates)}
            disabled={pending}
          >
            Templates
          </Button>
        </li>
        <li>
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={() => run(onHistory)}
            disabled={pending}
          >
            Version history
          </Button>
        </li>
        {showAssistant && onAssistant ? (
          <li>
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={() => run(onAssistant)}
              disabled={pending}
            >
              Estimate assistant
            </Button>
          </li>
        ) : null}
        <li>
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={() => run(onShortcuts)}
          >
            <Keyboard data-icon="inline-start" />
            Keyboard shortcuts
          </Button>
        </li>
        <li className="my-2 border-t border-border" />
        <li>
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={() => run(onGenerateProposal)}
            disabled={pending}
          >
            <FileText data-icon="inline-start" />
            Add proposal
          </Button>
        </li>
        {status === "Draft" ? (
          <li>
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={() => run(onFinalize)}
              disabled={pending}
            >
              <Lock data-icon="inline-start" />
              Mark final
            </Button>
          </li>
        ) : (
          <li>
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={() => run(onReopen)}
              disabled={pending}
            >
              <LockOpen data-icon="inline-start" />
              Reopen estimate
            </Button>
          </li>
        )}
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
        <li>
          <Button
            variant="ghost"
            className="w-full justify-start text-destructive hover:text-destructive"
            onClick={() => run(onDelete)}
            disabled={pending}
          >
            <Trash2 data-icon="inline-start" />
            Delete estimate
          </Button>
        </li>
      </ul>
    </Modal>
  );
}
