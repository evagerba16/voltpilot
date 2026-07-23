"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { assertPermission } from "@/lib/auth/get-team-context";
import {
  PROJECT_STATUSES,
  type ProjectInput,
  type ProjectStatus,
} from "@/lib/projects/types";
import { createClient } from "@/lib/supabase/server";

function parseProjectInput(formData: FormData): ProjectInput {
  return {
    customer_id: String(formData.get("customer_id") ?? "").trim(),
    project_name: String(formData.get("project_name") ?? "").trim(),
    project_address: String(formData.get("project_address") ?? "").trim(),
    general_contractor: String(formData.get("general_contractor") ?? "").trim(),
    project_type: String(formData.get("project_type") ?? "").trim(),
    bid_due_date: String(formData.get("bid_due_date") ?? "").trim(),
    status: String(formData.get("status") ?? "Lead").trim() as ProjectStatus,
    estimated_value: String(formData.get("estimated_value") ?? "").trim(),
    assigned_estimator: String(formData.get("assigned_estimator") ?? "").trim(),
    notes: String(formData.get("notes") ?? "").trim(),
  };
}

function validateProjectInput(input: ProjectInput) {
  if (!input.customer_id) return "Select a customer for this project.";
  if (!input.project_name) return "Enter a project name.";
  if (!input.project_type) return "Select a project type.";
  if (!PROJECT_STATUSES.includes(input.status)) {
    return "Select a valid project status.";
  }

  if (input.estimated_value) {
    const value = Number(input.estimated_value);
    if (Number.isNaN(value) || value < 0) {
      return "Contract value must be zero or greater.";
    }
  }

  return null;
}

function parseEstimatedValue(value: string) {
  if (!value) {
    return null;
  }

  return Number(value);
}

function nullableField(value: string) {
  return value || null;
}

async function verifyCustomerOwnership(customerId: string, organizationId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customers")
    .select("id")
    .eq("id", customerId)
    .eq("organization_id", organizationId)
    .single();

  return !error && Boolean(data);
}

function buildProjectRecord(input: ProjectInput) {
  return {
    customer_id: input.customer_id,
    project_name: input.project_name,
    project_address: nullableField(input.project_address),
    general_contractor: nullableField(input.general_contractor),
    project_type: input.project_type,
    bid_due_date: nullableField(input.bid_due_date),
    status: input.status,
    estimated_value: parseEstimatedValue(input.estimated_value),
    assigned_estimator: nullableField(input.assigned_estimator),
    notes: nullableField(input.notes),
  };
}

export async function createProject(formData: FormData) {
  const context = await assertPermission("projects.edit");

  const input = parseProjectInput(formData);
  const validationError = validateProjectInput(input);

  if (validationError) {
    return { error: validationError };
  }

  const ownsCustomer = await verifyCustomerOwnership(
    input.customer_id,
    context.organizationId
  );

  if (!ownsCustomer) {
    return { error: "That customer couldn't be found. Refresh the page and try again." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .insert({
      user_id: context.userId,
      organization_id: context.organizationId,
      ...buildProjectRecord(input),
    })
    .select("id")
    .single();

  if (error) {
    return {
      error: "We couldn't create this project. Check your details and try again.",
    };
  }

  revalidatePath("/projects");
  revalidatePath("/dashboard");
  redirect(`/projects/${data.id}`);
}

export async function updateProject(id: string, formData: FormData) {
  const context = await assertPermission("projects.edit");

  const input = parseProjectInput(formData);
  const validationError = validateProjectInput(input);

  if (validationError) {
    return { error: validationError };
  }

  const ownsCustomer = await verifyCustomerOwnership(
    input.customer_id,
    context.organizationId
  );

  if (!ownsCustomer) {
    return { error: "That customer couldn't be found. Refresh the page and try again." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("projects")
    .update(buildProjectRecord(input))
    .eq("id", id)
    .eq("organization_id", context.organizationId);

  if (error) {
    return {
      error: "We couldn't save this project. Check your details and try again.",
    };
  }

  revalidatePath("/projects");
  revalidatePath(`/projects/${id}`);
  revalidatePath(`/projects/${id}/edit`);
  revalidatePath("/dashboard");
  redirect(`/projects/${id}`);
}

export async function archiveProject(id: string) {
  const context = await assertPermission("projects.edit");

  const supabase = await createClient();
  const { data: project, error: fetchError } = await supabase
    .from("projects")
    .select("status, project_name")
    .eq("id", id)
    .eq("organization_id", context.organizationId)
    .single();

  if (fetchError || !project) {
    return {
      error: "This project couldn't be found. Refresh the page and try again.",
    };
  }

  const currentStatus = project.status as ProjectStatus;
  const preArchiveStatus =
    currentStatus !== "Archived" ? currentStatus : "Lead";

  const { error } = await supabase
    .from("projects")
    .update({
      status: "Archived",
      archived_at: new Date().toISOString(),
      pre_archive_status: preArchiveStatus,
    })
    .eq("id", id)
    .eq("organization_id", context.organizationId);

  if (error) {
    return {
      error: `We couldn't archive ${project.project_name}. Try again in a moment.`,
    };
  }

  revalidatePath("/projects");
  revalidatePath(`/projects/${id}`);
  revalidatePath("/dashboard");
  return { success: true };
}

export async function restoreProject(id: string) {
  const context = await assertPermission("projects.edit");

  const supabase = await createClient();
  const { data: project, error: fetchError } = await supabase
    .from("projects")
    .select("pre_archive_status, project_name")
    .eq("id", id)
    .eq("organization_id", context.organizationId)
    .single();

  if (fetchError || !project) {
    return {
      error: "This project couldn't be found. Refresh the page and try again.",
    };
  }

  const restoredStatus = PROJECT_STATUSES.includes(
    project.pre_archive_status as ProjectStatus
  )
    ? (project.pre_archive_status as ProjectStatus)
    : "Lead";

  const { error } = await supabase
    .from("projects")
    .update({
      status: restoredStatus,
      archived_at: null,
      pre_archive_status: null,
    })
    .eq("id", id)
    .eq("organization_id", context.organizationId);

  if (error) {
    return {
      error: `We couldn't restore ${project.project_name}. Try again in a moment.`,
    };
  }

  revalidatePath("/projects");
  revalidatePath(`/projects/${id}`);
  revalidatePath("/dashboard");
  return { success: true };
}
