"use client";

import { useMemo, useState, useTransition } from "react";
import { Loader2, UserMinus, UserPlus } from "lucide-react";

import {
  assignProjectMember,
  unassignProjectMember,
} from "@/app/(dashboard)/projects/assignment-actions";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-provider";
import { useToast } from "@/components/ui/toast-provider";
import type {
  AssignableTeamMember,
  ProjectAssignmentView,
} from "@/lib/projects/assignments";
import { cn } from "@/lib/utils";

type ProjectAssignmentsPanelProps = {
  projectId: string;
  assignments: ProjectAssignmentView[];
  assignableMembers: AssignableTeamMember[];
  canManage: boolean;
};

const selectClassName =
  "h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function ProjectAssignmentsPanel({
  projectId,
  assignments,
  assignableMembers,
  canManage,
}: ProjectAssignmentsPanelProps) {
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [pending, startTransition] = useTransition();
  const [removingId, setRemovingId] = useState<string | null>(null);
  const { success, error: toastError } = useToast();
  const confirm = useConfirm();

  const memberOptions = useMemo(
    () =>
      assignableMembers.map((member) => ({
        value: member.id,
        label: `${member.displayName} · ${member.roleLabel}`,
      })),
    [assignableMembers]
  );

  function handleAssign() {
    if (!selectedMemberId) {
      toastError("Select a team member to assign.");
      return;
    }

    startTransition(async () => {
      const result = await assignProjectMember(projectId, selectedMemberId);

      if (result?.error) {
        toastError(result.error);
        return;
      }

      success("Team member assigned to this project.");
      setSelectedMemberId("");
    });
  }

  async function handleUnassign(assignment: ProjectAssignmentView) {
    const confirmed = await confirm({
      title: `Remove ${assignment.displayName}?`,
      description: "They will lose access to this project unless assigned again.",
      confirmLabel: "Remove assignment",
      variant: "destructive",
    });

    if (!confirmed) {
      return;
    }

    setRemovingId(assignment.id);
    startTransition(async () => {
      const result = await unassignProjectMember(projectId, assignment.id);

      setRemovingId(null);

      if (result?.error) {
        toastError(result.error);
        return;
      }

      success(`${assignment.displayName} was unassigned from this project.`);
    });
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold tracking-tight">
            Assigned team members
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Field and project roles only see projects they are assigned to.
          </p>
        </div>
      </div>

      {assignments.length === 0 ? (
        <p className="mt-5 text-sm text-muted-foreground">
          No team members assigned yet.
          {canManage ? " Assign someone below to grant project access." : null}
        </p>
      ) : (
        <ul className="mt-5 divide-y divide-border rounded-xl border border-border">
          {assignments.map((assignment) => (
            <li
              key={assignment.id}
              className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="text-sm font-medium">{assignment.displayName}</p>
                <p className="text-xs text-muted-foreground">
                  {assignment.roleLabel} · {assignment.email}
                </p>
              </div>
              {canManage ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={pending && removingId === assignment.id}
                  onClick={() => handleUnassign(assignment)}
                  className="shrink-0"
                >
                  {pending && removingId === assignment.id ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <UserMinus className="size-4" />
                  )}
                  Remove
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {canManage ? (
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-2">
            <label
              htmlFor="project-assign-member"
              className="text-sm font-medium"
            >
              Assign team member
            </label>
            <select
              id="project-assign-member"
              className={cn(selectClassName, memberOptions.length === 0 && "opacity-60")}
              value={selectedMemberId}
              onChange={(event) => setSelectedMemberId(event.target.value)}
              disabled={pending || memberOptions.length === 0}
            >
              <option value="">
                {memberOptions.length === 0
                  ? "All active members are assigned"
                  : "Select a team member"}
              </option>
              {memberOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <Button
            type="button"
            onClick={handleAssign}
            disabled={pending || !selectedMemberId}
            className="sm:mb-0.5"
          >
            {pending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <UserPlus className="size-4" />
            )}
            Assign
          </Button>
        </div>
      ) : null}
    </section>
  );
}
