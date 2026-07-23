export const TEAM_ROLES = [
  "owner",
  "admin",
  "estimator",
  "project_manager",
  "viewer",
] as const;

export type TeamRole = (typeof TEAM_ROLES)[number];

export const INVITABLE_ROLES = [
  "admin",
  "estimator",
  "project_manager",
  "viewer",
] as const;

export type InvitableRole = (typeof INVITABLE_ROLES)[number];

export const TEAM_MEMBER_STATUSES = ["active", "deactivated"] as const;

export type TeamMemberStatus = (typeof TEAM_MEMBER_STATUSES)[number];

export type Organization = {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
};

export type TeamMember = {
  id: string;
  organization_id: string;
  user_id: string | null;
  email: string;
  display_name: string | null;
  role: TeamRole;
  status: TeamMemberStatus;
  invited_by: string | null;
  joined_at: string | null;
  deactivated_at: string | null;
  deactivated_by: string | null;
  created_at: string;
  updated_at: string;
};

export type TeamInvitation = {
  id: string;
  organization_id: string;
  email: string;
  role: InvitableRole;
  token: string;
  invited_by: string;
  expires_at: string;
  accepted_at: string | null;
  revoked_at: string | null;
  created_at: string;
};

export const TEAM_ROLE_LABELS: Record<TeamRole, string> = {
  owner: "Owner",
  admin: "Admin",
  estimator: "Estimator",
  project_manager: "Project Manager",
  viewer: "Viewer",
};

export const TEAM_ROLE_DESCRIPTIONS: Record<TeamRole, string> = {
  owner: "Full access including billing and team ownership",
  admin: "Manage team, settings, and all project data",
  estimator: "Create and edit estimates and projects",
  project_manager: "Manage projects, customers, estimates, and proposals",
  viewer: "Read-only access to projects and estimates",
};

export type TeamPermission =
  | "dashboard.view"
  | "customers.view"
  | "customers.edit"
  | "projects.view"
  | "projects.edit"
  | "estimates.view"
  | "estimates.edit"
  | "proposals.view"
  | "proposals.edit"
  | "analytics.view"
  | "ai.view"
  | "settings.company.view"
  | "settings.company.edit"
  | "settings.team.view"
  | "settings.team.manage"
  | "settings.billing.view"
  | "settings.billing.manage";

export type TeamContext = {
  userId: string;
  userEmail: string;
  organizationId: string;
  organizationName: string;
  role: TeamRole;
  memberId: string;
  permissions: TeamPermission[];
};

export type TeamMemberWithMeta = TeamMember & {
  isCurrentUser: boolean;
};

export type TeamOverview = {
  organization: Organization;
  members: TeamMemberWithMeta[];
  invitations: TeamInvitation[];
  currentMember: TeamMember;
};
