"use client";

import { useState, useTransition } from "react";
import {
  Ban,
  Copy,
  Mail,
  RotateCcw,
  UserMinus,
  UserPlus,
} from "lucide-react";

import {
  deactivateTeamMember,
  inviteTeamMember,
  reactivateTeamMember,
  revokeTeamInvitation,
  updateTeamMemberRole,
} from "@/app/(dashboard)/settings/team/actions";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-provider";
import {
  INVITABLE_ROLES,
  TEAM_ROLE_DESCRIPTIONS,
  TEAM_ROLE_LABELS,
  type TeamOverview,
  type TeamRole,
} from "@/lib/teams/types";
import { cn } from "@/lib/utils";

type TeamManagementProps = {
  overview: TeamOverview;
  canManage: boolean;
  currentRole: TeamRole;
};

function formatDate(value: string | null) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export function TeamManagement({
  overview,
  canManage,
  currentRole,
}: TeamManagementProps) {
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const confirm = useConfirm();

  const activeMembers = overview.members.filter((member) => member.status === "active");
  const deactivatedMembers = overview.members.filter(
    (member) => member.status === "deactivated"
  );

  function handleInvite(formData: FormData) {
    setError(null);
    setMessage(null);
    setInviteUrl(null);

    startTransition(async () => {
      const result = await inviteTeamMember(formData);

      if (result.error) {
        setError(result.error);
        return;
      }

      setMessage(result.message ?? "Invitation created.");
      setInviteUrl(result.inviteUrl ?? null);
    });
  }

  function handleRoleChange(memberId: string, role: TeamRole) {
    setError(null);
    setMessage(null);

    startTransition(async () => {
      const result = await updateTeamMemberRole(memberId, role);
      if (result.error) setError(result.error);
      else setMessage("Role updated.");
    });
  }

  async function handleDeactivate(memberId: string) {
    const confirmed = await confirm({
      title: "Deactivate team member",
      description:
        "Deactivate this team member? Their historical work will remain intact.",
      confirmLabel: "Deactivate",
      variant: "destructive",
    });

    if (!confirmed) {
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await deactivateTeamMember(memberId);
      if (result.error) setError(result.error);
      else setMessage("Team member deactivated.");
    });
  }

  function handleReactivate(memberId: string) {
    setError(null);
    startTransition(async () => {
      const result = await reactivateTeamMember(memberId);
      if (result.error) setError(result.error);
      else setMessage("Team member reactivated.");
    });
  }

  function handleRevokeInvitation(invitationId: string) {
    setError(null);
    startTransition(async () => {
      const result = await revokeTeamInvitation(invitationId);
      if (result.error) setError(result.error);
      else setMessage("Invitation revoked.");
    });
  }

  async function copyInviteUrl() {
    if (!inviteUrl) return;

    try {
      await navigator.clipboard.writeText(inviteUrl);
      setMessage("Invite link copied to clipboard.");
    } catch {
      setError("Unable to copy link. Select and copy it manually.");
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h2 className="text-base font-semibold">Organization</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {overview.organization.name} · {activeMembers.length} active member
          {activeMembers.length === 1 ? "" : "s"}
        </p>
      </div>

      {canManage ? (
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <UserPlus className="size-4 text-primary" />
            <h2 className="text-base font-semibold">Invite team member</h2>
          </div>

          <form action={handleInvite} className="grid gap-4 md:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)_auto]">
            <div className="space-y-2">
              <label htmlFor="invite-email" className="text-sm font-medium">
                Email address
              </label>
              <input
                id="invite-email"
                name="email"
                type="email"
                required
                placeholder="estimator@company.com"
                className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="invite-role" className="text-sm font-medium">
                Role
              </label>
              <select
                id="invite-role"
                name="role"
                defaultValue="estimator"
                className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                {INVITABLE_ROLES.map((role) => (
                  <option key={role} value={role}>
                    {TEAM_ROLE_LABELS[role]}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <Button type="submit" disabled={pending}>
                <Mail data-icon="inline-start" />
                {pending ? "Sending..." : "Send invite"}
              </Button>
            </div>
          </form>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {INVITABLE_ROLES.map((role) => (
              <div key={role} className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">
                  {TEAM_ROLE_LABELS[role]}:
                </span>{" "}
                {TEAM_ROLE_DESCRIPTIONS[role]}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {error ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {message ? (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-400">
          <p>{message}</p>
          {inviteUrl ? (
            <button
              type="button"
              onClick={() => void copyInviteUrl()}
              className="mt-2 inline-flex items-center gap-1 text-xs font-medium underline"
            >
              <Copy className="size-3" />
              Copy invite link
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="border-b border-border px-6 py-4">
          <h2 className="text-base font-semibold">Active members</h2>
        </div>
        <div className="divide-y divide-border/60">
          {activeMembers.map((member) => (
            <div
              key={member.id}
              className="flex flex-col gap-3 px-6 py-4 lg:flex-row lg:items-center lg:justify-between"
            >
              <div>
                <p className="text-sm font-medium">
                  {member.display_name || member.email}
                  {member.isCurrentUser ? (
                    <span className="ml-2 text-xs text-muted-foreground">(You)</span>
                  ) : null}
                </p>
                <p className="text-sm text-muted-foreground">{member.email}</p>
                <p className="text-xs text-muted-foreground">
                  Joined {formatDate(member.joined_at)}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {canManage && !member.isCurrentUser && member.role !== "owner" ? (
                  <select
                    value={member.role}
                    onChange={(event) =>
                      handleRoleChange(member.id, event.target.value as TeamRole)
                    }
                    disabled={pending || currentRole !== "owner" && member.role === "admin"}
                    className="h-8 rounded-lg border border-input bg-background px-2 text-sm"
                  >
                    {(["admin", "estimator", "project_manager", "viewer"] as const).map(
                      (role) => (
                        <option key={role} value={role}>
                          {TEAM_ROLE_LABELS[role]}
                        </option>
                      )
                    )}
                  </select>
                ) : (
                  <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium">
                    {TEAM_ROLE_LABELS[member.role]}
                  </span>
                )}

                {canManage &&
                !member.isCurrentUser &&
                member.role !== "owner" ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeactivate(member.id)}
                    disabled={pending}
                  >
                    <UserMinus data-icon="inline-start" />
                    Deactivate
                  </Button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </div>

      {overview.invitations.length > 0 ? (
        <div className="rounded-xl border border-border bg-card shadow-sm">
          <div className="border-b border-border px-6 py-4">
            <h2 className="text-base font-semibold">Pending invitations</h2>
          </div>
          <div className="divide-y divide-border/60">
            {overview.invitations.map((invitation) => (
              <div
                key={invitation.id}
                className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-sm font-medium">{invitation.email}</p>
                  <p className="text-sm text-muted-foreground">
                    {TEAM_ROLE_LABELS[invitation.role]} · Expires{" "}
                    {formatDate(invitation.expires_at)}
                  </p>
                </div>
                {canManage ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRevokeInvitation(invitation.id)}
                    disabled={pending}
                  >
                    <Ban data-icon="inline-start" />
                    Revoke
                  </Button>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {deactivatedMembers.length > 0 ? (
        <div className="rounded-xl border border-border bg-card shadow-sm">
          <div className="border-b border-border px-6 py-4">
            <h2 className="text-base font-semibold">Deactivated members</h2>
            <p className="text-sm text-muted-foreground">
              Historical estimates, projects, and proposals remain linked to your organization.
            </p>
          </div>
          <div className="divide-y divide-border/60">
            {deactivatedMembers.map((member) => (
              <div
                key={member.id}
                className={cn(
                  "flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between",
                  "opacity-80"
                )}
              >
                <div>
                  <p className="text-sm font-medium">{member.email}</p>
                  <p className="text-sm text-muted-foreground">
                    {TEAM_ROLE_LABELS[member.role]} · Deactivated{" "}
                    {formatDate(member.deactivated_at)}
                  </p>
                </div>
                {canManage ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleReactivate(member.id)}
                    disabled={pending}
                  >
                    <RotateCcw data-icon="inline-start" />
                    Reactivate
                  </Button>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
