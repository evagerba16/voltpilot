/**
 * Volt AI workflow context — scopes embedded ask panels to the contractor's
 * current customer, project, estimate, or job without leaving the page.
 */

export type VoltAiFocus = "job-costing" | "estimate" | "proposal";

export type VoltAiContextParams = {
  customerId?: string;
  projectId?: string;
  estimateId?: string;
  focus?: VoltAiFocus;
};

export type VoltAiEntityRef = {
  id: string;
  name: string;
  href: string;
};

export type VoltAiContextualAction = {
  id: string;
  label: string;
  description: string;
  href?: string;
  askPrompt?: string;
  priority: "primary" | "secondary";
};

export type VoltAiResolvedContext = {
  organizationId: string;
  params: VoltAiContextParams;
  primaryEntity: "organization" | "customer" | "project" | "estimate" | "job";
  customer?: VoltAiEntityRef;
  project?: VoltAiEntityRef & { customerId: string };
  estimate?: VoltAiEntityRef & { projectId: string };
  job?: VoltAiEntityRef;
  workflowHref: string;
  workflowLabel: string;
  isContextual: boolean;
};

function firstParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function isValidFocus(value: string | undefined): value is VoltAiFocus {
  return value === "job-costing" || value === "estimate" || value === "proposal";
}

export function parseVoltAiContextParams(
  searchParams: Record<string, string | string[] | undefined>
): VoltAiContextParams {
  const customerId = firstParam(searchParams.customerId)?.trim() || undefined;
  const projectId = firstParam(searchParams.projectId)?.trim() || undefined;
  const estimateId = firstParam(searchParams.estimateId)?.trim() || undefined;
  const focusRaw = firstParam(searchParams.focus)?.trim();
  const focus = isValidFocus(focusRaw) ? focusRaw : undefined;

  return {
    customerId,
    projectId,
    estimateId,
    focus,
  };
}

export function buildVoltAiHref(params: VoltAiContextParams): string {
  const query = new URLSearchParams();

  if (params.customerId) {
    query.set("customerId", params.customerId);
  }

  if (params.projectId) {
    query.set("projectId", params.projectId);
  }

  if (params.estimateId) {
    query.set("estimateId", params.estimateId);
  }

  if (params.focus) {
    query.set("focus", params.focus);
  }

  const serialized = query.toString();
  return serialized ? `/ai?${serialized}` : "/ai";
}

export function buildVoltAiContextFromCustomer(customerId: string): VoltAiContextParams {
  return { customerId };
}

export function buildVoltAiContextFromProject(
  projectId: string,
  customerId: string,
  focus?: VoltAiFocus
): VoltAiContextParams {
  return {
    customerId,
    projectId,
    focus,
  };
}

export function buildVoltAiContextFromEstimate(
  estimateId: string,
  projectId: string,
  customerId: string
): VoltAiContextParams {
  return {
    customerId,
    projectId,
    estimateId,
    focus: "estimate",
  };
}

export function buildVoltAiContextFromProposal(
  projectId: string,
  customerId: string
): VoltAiContextParams {
  return {
    customerId,
    projectId,
    focus: "proposal",
  };
}

export function buildVoltAiContextFromJob(
  projectId: string,
  customerId: string
): VoltAiContextParams {
  return {
    customerId,
    projectId,
    focus: "job-costing",
  };
}
