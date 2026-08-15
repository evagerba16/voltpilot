"use client";

import { useState, useTransition } from "react";
import { Check, FileDiff, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";

import {
  createProjectChangeOrder,
  deleteProjectChangeOrder,
  updateProjectChangeOrder,
  updateProjectChangeOrderStatus,
} from "@/app/(dashboard)/projects/job-costing-actions";
import { AlertBanner } from "@/components/ui/alert-banner";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useConfirm } from "@/components/ui/confirm-provider";
import { useToast } from "@/components/ui/toast-provider";
import { formatCurrency, formatDate } from "@/lib/projects/format";
import {
  CHANGE_ORDER_STATUS_STYLES,
  type ChangeOrderStatus,
  type ProjectChangeOrder,
} from "@/lib/projects/job-costing-types";
import { cn } from "@/lib/utils";

type ProjectChangeOrdersPanelProps = {
  projectId: string;
  changeOrders: ProjectChangeOrder[];
  canEdit: boolean;
};

const inputClassName =
  "h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

const labelClassName = "text-sm font-medium";

export function ProjectChangeOrdersPanel({
  projectId,
  changeOrders,
  canEdit,
}: ProjectChangeOrdersPanelProps) {
  const [open, setOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<ProjectChangeOrder | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [statusPending, setStatusPending] = useState<string | null>(null);
  const { success, error: toastError } = useToast();
  const confirm = useConfirm();

  const approvedValue = changeOrders
    .filter((order) => order.status === "approved")
    .reduce((sum, order) => sum + order.value_change, 0);

  function handleCreate(formData: FormData) {
    submitChangeOrder(formData, null);
  }

  function handleUpdate(formData: FormData) {
    if (!editingOrder) {
      return;
    }
    submitChangeOrder(formData, editingOrder.id);
  }

  function submitChangeOrder(formData: FormData, changeOrderId: string | null) {
    setError(null);
    const title = String(formData.get("title") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();
    const valueChange = Number(formData.get("value_change"));
    const costImpact = Number(formData.get("cost_impact"));

    startTransition(async () => {
      const payload = {
        title,
        description: description || undefined,
        value_change: Number.isFinite(valueChange) ? valueChange : 0,
        cost_impact: Number.isFinite(costImpact) ? costImpact : 0,
      };

      const result = changeOrderId
        ? await updateProjectChangeOrder(projectId, changeOrderId, payload)
        : await createProjectChangeOrder(projectId, { ...payload, status: "pending" });

      if (result.error) {
        setError(result.error);
        return;
      }

      success(changeOrderId ? "Change order updated." : "Change order created.");
      setOpen(false);
      setEditingOrder(null);
    });
  }

  async function handleDelete(changeOrderId: string) {
    const confirmed = await confirm({
      title: "Delete this change order?",
      description: "This cannot be undone.",
      confirmLabel: "Delete",
      variant: "destructive",
    });

    if (!confirmed) {
      return;
    }

    setStatusPending(changeOrderId);
    startTransition(async () => {
      const result = await deleteProjectChangeOrder(projectId, changeOrderId);

      if (result.error) {
        toastError(result.error);
        setStatusPending(null);
        return;
      }

      success("Change order deleted.");
      setStatusPending(null);
    });
  }

  function openCreateModal() {
    setEditingOrder(null);
    setError(null);
    setOpen(true);
  }

  function openEditModal(order: ProjectChangeOrder) {
    setEditingOrder(order);
    setError(null);
    setOpen(true);
  }

  function closeModal() {
    setOpen(false);
    setEditingOrder(null);
    setError(null);
  }

  function handleStatusUpdate(changeOrderId: string, status: ChangeOrderStatus) {
    setStatusPending(changeOrderId);
    startTransition(async () => {
      const result = await updateProjectChangeOrderStatus(projectId, changeOrderId, status);

      if (result.error) {
        toastError(result.error);
        setStatusPending(null);
        return;
      }

      success(status === "approved" ? "Change order approved." : "Change order updated.");
      setStatusPending(null);
    });
  }

  if (changeOrders.length === 0) {
    return (
      <>
        <details
          id="change-orders"
          className="group overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-6 py-4 marker:content-none [&::-webkit-details-marker]:hidden">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <FileDiff className="size-5" />
              </div>
              <div>
                <h2 className="text-base font-semibold">Change orders</h2>
                <p className="text-sm text-muted-foreground">
                  None yet — add when scope or contract value changes
                </p>
              </div>
            </div>
            {canEdit ? (
              <Button
                size="sm"
                onClick={(event) => {
                  event.preventDefault();
                  openCreateModal();
                }}
              >
                <Plus data-icon="inline-start" className="size-4" />
                New change order
              </Button>
            ) : null}
          </summary>
        </details>

        <ChangeOrderModal
          open={open}
          onClose={closeModal}
          onSubmit={handleCreate}
          error={error}
          pending={pending}
          initialOrder={editingOrder}
        />
      </>
    );
  }

  return (
    <section
      id="change-orders"
      className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="flex flex-col gap-3 border-b border-border px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <FileDiff className="size-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold">Change Orders</h2>
            <p className="text-sm text-muted-foreground">
              Track scope changes and contract value adjustments
            </p>
          </div>
        </div>
        {canEdit ? (
          <Button size="sm" onClick={openCreateModal}>
            <Plus data-icon="inline-start" className="size-4" />
            New change order
          </Button>
        ) : null}
      </div>

      <div className="grid gap-4 border-b border-border px-6 py-4 sm:grid-cols-3">
        <SummaryMetric label="Total orders" value={String(changeOrders.length)} />
        <SummaryMetric
          label="Approved contract impact"
          value={formatCurrency(approvedValue)}
          tone={approvedValue >= 0 ? "success" : "danger"}
        />
        <SummaryMetric
          label="Pending approval"
          value={String(
            changeOrders.filter(
              (order) => order.status === "pending" || order.status === "draft"
            ).length
          )}
        />
      </div>

      <div className="divide-y divide-border/60">
        {changeOrders.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-muted-foreground">
            No change orders yet. Create one when scope or contract value changes in the field.
          </p>
        ) : (
          changeOrders.map((order) => (
            <article
              key={order.id}
              className="px-6 py-4 transition-colors hover:bg-muted/20"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold">{order.title}</h3>
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide",
                        CHANGE_ORDER_STATUS_STYLES[order.status]
                      )}
                    >
                      {order.status}
                    </span>
                  </div>
                  {order.description ? (
                    <p className="text-sm text-muted-foreground">{order.description}</p>
                  ) : null}
                  <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                    <span>Contract {formatSignedCurrency(order.value_change)}</span>
                    {order.cost_impact !== 0 ? (
                      <span>Cost impact {formatCurrency(order.cost_impact)}</span>
                    ) : null}
                    <span>Created {formatDate(order.created_at)}</span>
                    {order.approved_at ? (
                      <span>Approved {formatDate(order.approved_at)}</span>
                    ) : null}
                  </div>
                </div>

                {canEdit && order.status !== "approved" ? (
                  <div className="flex shrink-0 flex-wrap gap-2">
                    {(order.status === "pending" || order.status === "draft") ? (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={statusPending === order.id}
                          onClick={() => openEditModal(order)}
                        >
                          <Pencil className="size-4" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={statusPending === order.id}
                          onClick={() => handleStatusUpdate(order.id, "rejected")}
                        >
                          {statusPending === order.id ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <X className="size-4" />
                          )}
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          disabled={statusPending === order.id}
                          onClick={() => handleStatusUpdate(order.id, "approved")}
                        >
                          {statusPending === order.id ? (
                            <Loader2 data-icon="inline-start" className="size-4 animate-spin" />
                          ) : (
                            <Check data-icon="inline-start" className="size-4" />
                          )}
                          Approve
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={statusPending === order.id}
                        onClick={() => handleDelete(order.id)}
                      >
                        {statusPending === order.id ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Trash2 className="size-4" />
                        )}
                        Delete
                      </Button>
                    )}
                  </div>
                ) : null}
              </div>
            </article>
          ))
        )}
      </div>

      <ChangeOrderModal
        open={open}
        onClose={closeModal}
        onSubmit={editingOrder ? handleUpdate : handleCreate}
        error={error}
        pending={pending}
        initialOrder={editingOrder}
      />
    </section>
  );
}

function ChangeOrderModal({
  open,
  onClose,
  onSubmit,
  error,
  pending,
  initialOrder,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (formData: FormData) => void;
  error: string | null;
  pending: boolean;
  initialOrder?: ProjectChangeOrder | null;
}) {
  const isEdit = Boolean(initialOrder);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit change order" : "New change order"}
      description={
        isEdit
          ? "Update scope details before approval."
          : "Record added or removed scope. Approving updates contract value and job costs."
      }
    >
      <form action={onSubmit} className="space-y-4" key={initialOrder?.id ?? "create"}>
        {error ? <AlertBanner variant="error">{error}</AlertBanner> : null}

        <div className="space-y-2">
          <label className={labelClassName} htmlFor="co-title">
            Title
          </label>
          <input
            id="co-title"
            name="title"
            required
            defaultValue={initialOrder?.title ?? ""}
            className={inputClassName}
          />
        </div>

        <div className="space-y-2">
          <label className={labelClassName} htmlFor="co-description">
            Description
          </label>
          <textarea
            id="co-description"
            name="description"
            rows={3}
            defaultValue={initialOrder?.description ?? ""}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className={labelClassName} htmlFor="co-value">
              Contract value change
            </label>
            <input
              id="co-value"
              name="value_change"
              type="number"
              step="0.01"
              defaultValue={initialOrder?.value_change ?? 0}
              className={inputClassName}
            />
            <p className="text-xs text-muted-foreground">Use negative for credits.</p>
          </div>
          <div className="space-y-2">
            <label className={labelClassName} htmlFor="co-cost">
              Cost impact
            </label>
            <input
              id="co-cost"
              name="cost_impact"
              type="number"
              min={0}
              step="0.01"
              defaultValue={initialOrder?.cost_impact ?? 0}
              className={inputClassName}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? <Loader2 data-icon="inline-start" className="size-4 animate-spin" /> : null}
            {isEdit ? "Update change order" : "Create change order"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function SummaryMetric({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "success" | "danger";
}) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "text-lg font-semibold tabular-nums",
          tone === "success" && "text-emerald-700 dark:text-emerald-400",
          tone === "danger" && "text-destructive"
        )}
      >
        {value}
      </p>
    </div>
  );
}

function formatSignedCurrency(value: number) {
  const prefix = value >= 0 ? "+" : "";
  return `${prefix}${formatCurrency(value)}`;
}
