"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";

import { createEstimate } from "@/app/(dashboard)/estimates/actions";
import { AlertBanner } from "@/components/ui/alert-banner";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Modal } from "@/components/ui/modal";
import { buttonVariants } from "@/components/ui/button-variants";
import { selectClassName } from "@/lib/ui/form-classes";
import type { ProjectOption } from "@/lib/estimates/queries";
import { FolderKanban } from "lucide-react";

type CreateEstimateDialogProps = {
  open: boolean;
  onClose: () => void;
  projects: ProjectOption[];
  defaultProjectId?: string;
};

export function CreateEstimateDialog({
  open,
  onClose,
  projects,
  defaultProjectId = "",
}: CreateEstimateDialogProps) {
  const [projectId, setProjectId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (open) {
      setError(null);
      setProjectId(
        defaultProjectId && projects.some((p) => p.id === defaultProjectId)
          ? defaultProjectId
          : (projects[0]?.id ?? "")
      );
    }
  }, [open, projects, defaultProjectId]);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (!projectId) {
      setError("Select a project to continue.");
      return;
    }

    startTransition(async () => {
      const result = await createEstimate(projectId);

      if (result?.error) {
        setError(result.error);
      }
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add estimate"
      description="Pick the project you want to price. You can add line items and adjust markups on the next screen."
      size="sm"
    >
      {projects.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="No projects yet"
          description="Create a project first, then return here to build your first estimate."
          action={
            <Link href="/projects/new" className={buttonVariants()} onClick={onClose}>
              Create your first project
            </Link>
          }
          className="py-8"
        />
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error ? <AlertBanner variant="error">{error}</AlertBanner> : null}

          <div className="space-y-2">
            <label htmlFor="project_id" className="text-sm font-medium">
              Project
            </label>
            <select
              id="project_id"
              value={projectId}
              onChange={(event) => setProjectId(event.target.value)}
              className={selectClassName}
            >
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.project_name} — {project.customer.company_name}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              Each estimate belongs to one project. You can create multiple estimates per job.
            </p>
          </div>

          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Adding..." : "Add estimate"}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
