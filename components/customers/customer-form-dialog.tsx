"use client";

import { useEffect, useState, useTransition } from "react";

import {
  createCustomer,
  updateCustomer,
} from "@/app/(dashboard)/customers/actions";
import { AlertBanner } from "@/components/ui/alert-banner";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast-provider";
import type { Customer } from "@/lib/customers/types";

type CustomerFormDialogProps = {
  open: boolean;
  onClose: () => void;
  customer?: Customer | null;
};

const inputClassName =
  "h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

const labelClassName = "text-sm font-medium";

export function CustomerFormDialog({
  open,
  onClose,
  customer,
}: CustomerFormDialogProps) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const toast = useToast();
  const isEditing = Boolean(customer);

  useEffect(() => {
    if (open) {
      setError(null);
    }
  }, [open, customer]);

  function handleSubmit(formData: FormData) {
    setError(null);
    const companyName = String(formData.get("company_name") ?? "").trim();

    startTransition(async () => {
      const result = isEditing
        ? await updateCustomer(customer!.id, formData)
        : await createCustomer(formData);

      if (result.error) {
        setError(result.error);
        return;
      }

      toast.success(
        isEditing
          ? `${companyName || "Customer"} was updated.`
          : `${companyName || "Customer"} was added.`
      );
      onClose();
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEditing ? "Edit customer" : "Add customer"}
      description={
        isEditing
          ? "Update contact info and notes for this customer."
          : "Add a GC, owner, or client you bid work for."
      }
    >
      <form action={handleSubmit} className="space-y-4">
        {error ? <AlertBanner variant="error">{error}</AlertBanner> : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <label htmlFor="company_name" className={labelClassName}>
              Company name
            </label>
            <input
              id="company_name"
              name="company_name"
              required
              defaultValue={customer?.company_name ?? ""}
              className={inputClassName}
              placeholder="Acme Electrical Contractors"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="contact_name" className={labelClassName}>
              Contact name
            </label>
            <input
              id="contact_name"
              name="contact_name"
              required
              defaultValue={customer?.contact_name ?? ""}
              className={inputClassName}
              placeholder="Jane Smith"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="email" className={labelClassName}>
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              defaultValue={customer?.email ?? ""}
              className={inputClassName}
              placeholder="jane@acme.com"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="phone_number" className={labelClassName}>
              Phone number
            </label>
            <input
              id="phone_number"
              name="phone_number"
              type="tel"
              defaultValue={customer?.phone_number ?? ""}
              className={inputClassName}
              placeholder="(555) 123-4567"
            />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <label htmlFor="project_address" className={labelClassName}>
              Project address
            </label>
            <input
              id="project_address"
              name="project_address"
              defaultValue={customer?.project_address ?? ""}
              className={inputClassName}
              placeholder="123 Main St, Austin, TX"
            />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <label htmlFor="notes" className={labelClassName}>
              Notes
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={3}
              defaultValue={customer?.notes ?? ""}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              placeholder="Scope notes, billing preferences, or follow-ups"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={pending}>
            {pending
              ? "Saving..."
              : isEditing
                ? "Save changes"
                : "Add customer"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
