"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import {
  Ban,
  Check,
  Copy,
  Mail,
  RotateCcw,
  UserMinus,
  UserPlus,
  Users,
} from "lucide-react";

import {
  deactivateTeamMember,
  inviteTeamMemberFormAction,
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
import { ContactSupportLink } from "@/components/site/contact-support-link";
import type { OrganizationSeatUsage } from "@/lib/billing/entitlements";
import { formatSeatUsage } from "@/lib/billing/seat-display";
import { buildInviteUrlForCurrentOrigin } from "@/lib/teams/invite-url";
import { copyToClipboard } from "@/lib/utils/copy-to-clipboard";
import { cn } from "@/lib/utils";

function resolveInviteCopyUrl(inviteUrl: string | null | undefined, token?: string) {
  if (token) {
    return buildInviteUrlForCurrentOrigin(token);
  }

  if (!inviteUrl) {
    return null;
  }

  const match = inviteUrl.match(/\/invite\/([^/?#]+)/);
  if (match?.[1]) {
    return buildInviteUrlForCurrentOrigin(match[1]);
  }

  return inviteUrl;
}

type TeamManagementProps = {
  overview: TeamOverview;
  canManage: boolean;
  currentRole: TeamRole;
  b2bSeatUsage?: OrganizationSeatUsage | null;
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
  b2bSeatUsage = null,
}: TeamManagementProps) {
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [copiedLinkKey, setCopiedLinkKey] = useState<string | null>(null);
  const [inviteState, inviteAction, isInviting] = useActionState(
    inviteTeamMemberFormAction,
    null
  );
  const [pending, startTransition] = useTransition();
  const confirm = useConfirm();

  const latestInviteUrl =
    inviteState && "success" in inviteState ? inviteState.inviteUrl ?? null : null;

  useEffect(() => {
    if (!inviteState) {
      return;
    }

    if ("error" in inviteState && inviteState.error) {
      setError(inviteState.error);
      setMessage(null);
      return;
    }

    if ("success" in inviteState) {
      setError(null);
      setMessage(inviteState.message ?? "Invitation created.");
    }
  }, [inviteState]);

  useEffect(() => {
    if (!copiedLinkKey) {
      return;
    }

    const timeout = window.setTimeout(() => setCopiedLinkKey(null), 2000);
    return () => window.clearTimeout(timeout);
  }, [copiedLinkKey]);

  const activeMembers = overview.members.filter((member) => member.status === "active");
  const deactivatedMembers = overview.members.filter(
    (member) => member.status === "deactivated"
  );
  const inviteBlockedBySeats = Boolean(b2bSeatUsage && !b2bSeatUsage.canAddSeat);

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

  async function handleCopyInviteLink(url: string | null | undefined, key: string) {
    if (!url) {
      return;
    }

    try {
      await copyToClipboard(url);
      setCopiedLinkKey(key);
      setError(null);
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

      {b2bSeatUsage ? (
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Users className="size-4 text-primary" />
            <h2 className="text-base font-semibold">Team usage</h2>
          </div>
          <p className="text-sm font-medium">{formatSeatUsage(b2bSeatUsage)}</p>
          <dl className="mt-4 grid gap-4 sm:grid-cols-3">
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                Active members
              </dt>
              <dd className="mt-1 text-sm font-medium">{b2bSeatUsage.activeMembers}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                Pending invitations
              </dt>
              <dd className="mt-1 text-sm font-medium">{b2bSeatUsage.pendingInvites}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                Available seats
              </dt>
              <dd className="mt-1 text-sm font-medium">{b2bSeatUsage.seatsRemaining ?? "—"}</dd>
            </div>
          </dl>
          {inviteBlockedBySeats ? (
            <p className="mt-4 text-sm text-muted-foreground">
              Need more seats? Contact VoltPilot to increase your team capacity.{" "}
              <ContactSupportLink subject="Increase team seats">
                Contact VoltPilot
              </ContactSupportLink>
            </p>
          ) : null}
        </div>
      ) : null}

      {canManage ? (
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <UserPlus className="size-4 text-primary" />
            <h2 className="text-base font-semibold">Invite team member</h2>
          </div>

          {b2bSeatUsage ? (
            <p className="mb-4 text-sm text-muted-foreground">
              {inviteBlockedBySeats ? (
                <>
                  All {b2bSeatUsage.seatLimit} seats are in use ({b2bSeatUsage.seatsUsed}{" "}
                  assigned). Deactivate a member or revoke a pending invite to free a seat before
                  inviting someone new.
                </>
              ) : (
                <>
                  {b2bSeatUsage.seatsRemaining === 1
                    ? "1 seat available for a new invite."
                    : `${b2bSeatUsage.seatsRemaining} seats available for new invites.`}
                </>
              )}
            </p>
          ) : null}

          <form action={inviteAction} className="grid gap-4 md:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)_auto]">
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
                disabled={inviteBlockedBySeats || pending || isInviting}
                className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
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
                disabled={inviteBlockedBySeats || pending || isInviting}
                className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {INVITABLE_ROLES.map((role) => (
                  <option key={role} value={role}>
                    {TEAM_ROLE_LABELS[role]}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <Button type="submit" disabled={pending || isInviting || inviteBlockedBySeats}>
                <Mail data-icon="inline-start" />
                {isInviting ? "Sending..." : "Send invite"}
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
          {latestInviteUrl ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() =>
                void handleCopyInviteLink(
                  resolveInviteCopyUrl(latestInviteUrl),
                  "latest-invite"
                )
              }
            >
              {copiedLinkKey === "latest-invite" ? (
                <>
                  <Check data-icon="inline-start" />
                  Copied
                </>
              ) : (
                <>
                  <Copy data-icon="inline-start" />
                  Copy invite link
                </>
              )}
            </Button>
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
                    {INVITABLE_ROLES.map((role) => (
                      <option key={role} value={role}>
                        {TEAM_ROLE_LABELS[role]}
                      </option>
                    ))}
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
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        void handleCopyInviteLink(
                          resolveInviteCopyUrl(null, invitation.token),
                          invitation.id
                        )
                      }
                      disabled={pending || isInviting}
                    >
                      {copiedLinkKey === invitation.id ? (
                        <>
                          <Check data-icon="inline-start" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy data-icon="inline-start" />
                          Copy invite link
                        </>
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleRevokeInvitation(invitation.id)}
                      disabled={pending || isInviting}
                    >
                      <Ban data-icon="inline-start" />
                      Revoke
                    </Button>
                  </div>
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
                    disabled={pending || inviteBlockedBySeats}
                    title={
                      inviteBlockedBySeats
                        ? "Free a seat before reactivating this member."
                        : undefined
                    }
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
