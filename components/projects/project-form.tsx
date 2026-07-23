"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { ArrowLeft } from "lucide-react";

import {
  createProject,
  updateProject,
} from "@/app/(dashboard)/projects/actions";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import {
  PROJECT_STATUSES,
  PROJECT_TYPES,
  type ProjectWithCustomer,
} from "@/lib/projects/types";

type CustomerOption = {
  id: string;
  company_name: string;
};

type ProjectFormProps = {
  customers: CustomerOption[];
  project?: ProjectWithCustomer | null;
  cancelHref: string;
};

const inputClassName =
  "h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

const labelClassName = "text-sm font-medium";

export function ProjectForm({
  customers,
  project,
  cancelHref,
}: ProjectFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const isEditing = Boolean(project);

  function handleSubmit(formData: FormData) {
    setError(null);

    startTransition(async () => {
      const result = isEditing
        ? await updateProject(project!.id, formData)
        : await createProject(formData);

      if (result?.error) {
        setError(result.error);
      }
    });
  }

  if (customers.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold tracking-tight">Add a customer first</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Every project needs a customer. Add a GC, owner, or client before creating a job.
        </p>
        <div className="mt-4">
          <Link href="/customers" className={buttonVariants()}>
            Go to customers
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      <div className="border-b border-border px-6 py-4">
        <Link
          href={cancelHref}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back
        </Link>
        <h1 className="mt-3 text-xl font-semibold tracking-tight">
          {isEditing ? "Edit project" : "Add project"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isEditing
            ? "Update job details, bid timeline, and assignments."
            : "Set up a new job tied to a customer so you can estimate and bid."}
        </p>
      </div>

      <form action={handleSubmit} className="space-y-4 px-6 py-5">
        {error ? (
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <label htmlFor="project_name" className={labelClassName}>
              Project name
            </label>
            <input
              id="project_name"
              name="project_name"
              required
              defaultValue={project?.project_name ?? ""}
              className={inputClassName}
              placeholder="Riverside Medical Center — Phase 2"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="customer_id" className={labelClassName}>
              Customer
            </label>
            <select
              id="customer_id"
              name="customer_id"
              required
              defaultValue={project?.customer_id ?? ""}
              className={inputClassName}
            >
              <option value="" disabled>
                Select a customer
              </option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.company_name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="project_type" className={labelClassName}>
              Project type
            </label>
            <select
              id="project_type"
              name="project_type"
              required
              defaultValue={project?.project_type ?? "Commercial"}
              className={inputClassName}
            >
              {PROJECT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2 md:col-span-2">
            <label htmlFor="project_address" className={labelClassName}>
              Project address
            </label>
            <input
              id="project_address"
              name="project_address"
              defaultValue={project?.project_address ?? ""}
              className={inputClassName}
              placeholder="123 Main St, Austin, TX"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="general_contractor" className={labelClassName}>
              General contractor
            </label>
            <input
              id="general_contractor"
              name="general_contractor"
              defaultValue={project?.general_contractor ?? ""}
              className={inputClassName}
              placeholder="Summit Builders LLC"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="bid_due_date" className={labelClassName}>
              Bid due date
            </label>
            <input
              id="bid_due_date"
              name="bid_due_date"
              type="date"
              defaultValue={project?.bid_due_date ?? ""}
              className={inputClassName}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="status" className={labelClassName}>
              Project status
            </label>
            <select
              id="status"
              name="status"
              required
              defaultValue={project?.status ?? "Lead"}
              className={inputClassName}
            >
              {PROJECT_STATUSES.filter((status) => status !== "Archived").map(
                (status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                )
              )}
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="estimated_value" className={labelClassName}>
              Estimated contract value
            </label>
            <input
              id="estimated_value"
              name="estimated_value"
              type="number"
              min="0"
              step="0.01"
              defaultValue={project?.estimated_value ?? ""}
              className={inputClassName}
              placeholder="1250000"
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <label htmlFor="assigned_estimator" className={labelClassName}>
              Assigned estimator
            </label>
            <input
              id="assigned_estimator"
              name="assigned_estimator"
              defaultValue={project?.assigned_estimator ?? ""}
              className={inputClassName}
              placeholder="Maria Santos"
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <label htmlFor="notes" className={labelClassName}>
              Notes
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={4}
              defaultValue={project?.notes ?? ""}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              placeholder="Scope details, bid instructions, exclusions, or coordination notes"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <Link href={cancelHref} className={buttonVariants({ variant: "outline" })}>
            Cancel
          </Link>
          <Button type="submit" disabled={pending}>
            {pending
              ? "Saving..."
              : isEditing
                ? "Save changes"
                : "Add project"}
          </Button>
        </div>
      </form>
    </div>
  );
}
