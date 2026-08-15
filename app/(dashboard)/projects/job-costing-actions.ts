"use server";

import { revalidatePath } from "next/cache";

import { assertPermission } from "@/lib/auth/get-team-context";
import type { ChangeOrderStatus, JobCostingActualsInput } from "@/lib/projects/job-costing-types";
import {
  getProjectChangeOrders,
  syncJobActualsTotal,
} from "@/lib/projects/job-costing-queries";
import { parseNumber } from "@/lib/projects/format";
import { verifyProjectOwnership } from "@/lib/projects/queries";
import { createClient } from "@/lib/supabase/server";

const PHOTO_MAX_BYTES = 10 * 1024 * 1024;
const VALID_CO_STATUS = new Set<ChangeOrderStatus>([
  "draft",
  "pending",
  "approved",
  "rejected",
]);

function sanitizeFileName(name: string) {
  return name.replace(/[^\w.\-()+\s]/g, "_").slice(0, 180);
}

function revalidateProject(projectId: string) {
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/projects");
  revalidatePath("/dashboard");
}

async function assertProject(projectId: string) {
  const context = await assertPermission("projects.edit");
  const owns = await verifyProjectOwnership(projectId, context.organizationId);

  if (!owns) {
    return { error: "This project couldn't be found.", context: null };
  }

  return { error: null, context };
}

export async function saveProjectJobCosting(
  projectId: string,
  values: JobCostingActualsInput
) {
  const { error, context } = await assertProject(projectId);
  if (error || !context) {
    return { error: error ?? "Unable to save job costs." };
  }

  const changeOrders = await getProjectChangeOrders(projectId);
  const approvedCount = changeOrders.filter((order) => order.status === "approved").length;

  const supabase = await createClient();
  await syncJobActualsTotal(supabase, projectId, context.organizationId, {
    actual_labor: Math.max(0, values.actual_labor),
    actual_materials: Math.max(0, values.actual_materials),
    actual_equipment: Math.max(0, values.actual_equipment),
    actual_subcontractors: Math.max(0, values.actual_subcontractors),
    actual_miscellaneous: Math.max(0, values.actual_miscellaneous),
    change_order_count: approvedCount,
  });

  revalidateProject(projectId);
  return { success: true };
}

export async function createProjectChangeOrder(
  projectId: string,
  payload: {
    title: string;
    description?: string;
    value_change: number;
    cost_impact: number;
    status?: ChangeOrderStatus;
  }
) {
  const { error, context } = await assertProject(projectId);
  if (error || !context) {
    return { error: error ?? "Unable to create change order." };
  }

  if (!payload.title.trim()) {
    return { error: "Enter a change order title." };
  }

  const status = payload.status ?? "pending";
  if (!VALID_CO_STATUS.has(status)) {
    return { error: "Invalid change order status." };
  }

  const supabase = await createClient();
  const { data, error: insertError } = await supabase
    .from("project_change_orders")
    .insert({
      project_id: projectId,
      organization_id: context.organizationId,
      user_id: context.userId,
      title: payload.title.trim(),
      description: payload.description?.trim() || null,
      value_change: payload.value_change,
      cost_impact: payload.cost_impact,
      status,
      approved_at: status === "approved" ? new Date().toISOString() : null,
    })
    .select("id")
    .single();

  if (insertError) {
    return { error: "We couldn't create this change order. Try again." };
  }

  if (status === "approved") {
    await applyApprovedChangeOrder(projectId, context.organizationId, {
      value_change: payload.value_change,
      cost_impact: payload.cost_impact,
    });
  }

  revalidateProject(projectId);
  return { success: true, id: data.id };
}

export async function updateProjectChangeOrderStatus(
  projectId: string,
  changeOrderId: string,
  status: ChangeOrderStatus
) {
  const { error, context } = await assertProject(projectId);
  if (error || !context) {
    return { error: error ?? "Unable to update change order." };
  }

  if (!VALID_CO_STATUS.has(status)) {
    return { error: "Invalid change order status." };
  }

  const supabase = await createClient();
  const { data: existing, error: fetchError } = await supabase
    .from("project_change_orders")
    .select("*")
    .eq("id", changeOrderId)
    .eq("project_id", projectId)
    .eq("organization_id", context.organizationId)
    .single();

  if (fetchError || !existing) {
    return { error: "Change order not found." };
  }

  const wasApproved = existing.status === "approved";
  const willApprove = status === "approved";

  const { error: updateError } = await supabase
    .from("project_change_orders")
    .update({
      status,
      approved_at: willApprove ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", changeOrderId);

  if (updateError) {
    return { error: "We couldn't update this change order." };
  }

  if (!wasApproved && willApprove) {
    await applyApprovedChangeOrder(projectId, context.organizationId, {
      value_change: parseNumber(existing.value_change),
      cost_impact: parseNumber(existing.cost_impact),
    });
  }

  revalidateProject(projectId);
  return { success: true };
}

export async function updateProjectChangeOrder(
  projectId: string,
  changeOrderId: string,
  payload: {
    title: string;
    description?: string;
    value_change: number;
    cost_impact: number;
  }
) {
  const { error, context } = await assertProject(projectId);
  if (error || !context) {
    return { error: error ?? "Unable to update change order." };
  }

  if (!payload.title.trim()) {
    return { error: "Enter a change order title." };
  }

  const supabase = await createClient();
  const { data: existing, error: fetchError } = await supabase
    .from("project_change_orders")
    .select("status")
    .eq("id", changeOrderId)
    .eq("project_id", projectId)
    .eq("organization_id", context.organizationId)
    .single();

  if (fetchError || !existing) {
    return { error: "Change order not found." };
  }

  if (existing.status === "approved") {
    return { error: "Approved change orders can't be edited." };
  }

  const { error: updateError } = await supabase
    .from("project_change_orders")
    .update({
      title: payload.title.trim(),
      description: payload.description?.trim() || null,
      value_change: payload.value_change,
      cost_impact: payload.cost_impact,
      updated_at: new Date().toISOString(),
    })
    .eq("id", changeOrderId);

  if (updateError) {
    return { error: "We couldn't update this change order." };
  }

  revalidateProject(projectId);
  return { success: true };
}

export async function deleteProjectChangeOrder(projectId: string, changeOrderId: string) {
  const { error, context } = await assertProject(projectId);
  if (error || !context) {
    return { error: error ?? "Unable to delete change order." };
  }

  const supabase = await createClient();
  const { data: existing, error: fetchError } = await supabase
    .from("project_change_orders")
    .select("status")
    .eq("id", changeOrderId)
    .eq("project_id", projectId)
    .eq("organization_id", context.organizationId)
    .single();

  if (fetchError || !existing) {
    return { error: "Change order not found." };
  }

  if (existing.status === "approved") {
    return { error: "Approved change orders can't be deleted." };
  }

  const { error: deleteError } = await supabase
    .from("project_change_orders")
    .delete()
    .eq("id", changeOrderId);

  if (deleteError) {
    return { error: "We couldn't delete this change order." };
  }

  revalidateProject(projectId);
  return { success: true };
}

async function applyApprovedChangeOrder(
  projectId: string,
  organizationId: string,
  order: { value_change: number; cost_impact: number }
) {
  const supabase = await createClient();

  if (order.value_change !== 0) {
    const { data: project } = await supabase
      .from("projects")
      .select("estimated_value")
      .eq("id", projectId)
      .eq("organization_id", organizationId)
      .single();

    if (project) {
      const currentValue = parseNumber(project.estimated_value);
      await supabase
        .from("projects")
        .update({
          estimated_value: Math.max(0, currentValue + order.value_change),
          updated_at: new Date().toISOString(),
        })
        .eq("id", projectId);
    }
  }

  if (order.cost_impact !== 0) {
    const { data: actuals } = await supabase
      .from("project_job_actuals")
      .select("*")
      .eq("project_id", projectId)
      .maybeSingle();

    const miscellaneous = parseNumber(actuals?.actual_miscellaneous) + order.cost_impact;

    await syncJobActualsTotal(supabase, projectId, organizationId, {
      actual_labor: parseNumber(actuals?.actual_labor),
      actual_materials: parseNumber(actuals?.actual_materials),
      actual_equipment: parseNumber(actuals?.actual_equipment),
      actual_subcontractors: parseNumber(actuals?.actual_subcontractors),
      actual_miscellaneous: Math.max(0, miscellaneous),
      change_order_count:
        (await getProjectChangeOrders(projectId)).filter((item) => item.status === "approved")
          .length,
    });
  }
}

export async function createProjectJobLog(
  projectId: string,
  payload: {
    log_date: string;
    crew_members: string;
    hours_worked: number;
    work_completed: string;
    delays?: string;
    weather?: string;
    notes?: string;
  }
) {
  const { error, context } = await assertProject(projectId);
  if (error || !context) {
    return { error: error ?? "Unable to create job log." };
  }

  if (!payload.log_date) {
    return { error: "Select a log date." };
  }

  if (!payload.work_completed.trim()) {
    return { error: "Describe the work completed." };
  }

  const supabase = await createClient();
  const { data, error: insertError } = await supabase
    .from("project_job_logs")
    .insert({
      project_id: projectId,
      organization_id: context.organizationId,
      user_id: context.userId,
      log_date: payload.log_date,
      crew_members: payload.crew_members.trim(),
      hours_worked: Math.max(0, payload.hours_worked),
      work_completed: payload.work_completed.trim(),
      delays: payload.delays?.trim() || null,
      weather: payload.weather?.trim() || null,
      notes: payload.notes?.trim() || null,
    })
    .select("id")
    .single();

  if (insertError) {
    return { error: "We couldn't save this job log. Try again." };
  }

  revalidateProject(projectId);
  return { success: true, id: data.id };
}

export async function updateProjectJobLog(
  projectId: string,
  jobLogId: string,
  payload: {
    log_date: string;
    crew_members: string;
    hours_worked: number;
    work_completed: string;
    delays?: string;
    weather?: string;
    notes?: string;
  }
) {
  const { error, context } = await assertProject(projectId);
  if (error || !context) {
    return { error: error ?? "Unable to update job log." };
  }

  if (!payload.log_date) {
    return { error: "Select a log date." };
  }

  if (!payload.work_completed.trim()) {
    return { error: "Describe the work completed." };
  }

  const supabase = await createClient();
  const { error: updateError } = await supabase
    .from("project_job_logs")
    .update({
      log_date: payload.log_date,
      crew_members: payload.crew_members.trim(),
      hours_worked: Math.max(0, payload.hours_worked),
      work_completed: payload.work_completed.trim(),
      delays: payload.delays?.trim() || null,
      weather: payload.weather?.trim() || null,
      notes: payload.notes?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobLogId)
    .eq("project_id", projectId)
    .eq("organization_id", context.organizationId);

  if (updateError) {
    return { error: "We couldn't update this job log. Try again." };
  }

  revalidateProject(projectId);
  return { success: true };
}

export async function uploadProjectJobLogPhoto(
  projectId: string,
  jobLogId: string,
  formData: FormData
) {
  const { error, context } = await assertProject(projectId);
  if (error || !context) {
    return { error: error ?? "Unable to upload photo." };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size <= 0) {
    return { error: "Choose a photo to upload." };
  }

  if (file.size > PHOTO_MAX_BYTES) {
    return { error: "Photos must be 10 MB or smaller." };
  }

  if (!file.type.startsWith("image/")) {
    return { error: "Upload an image file (JPEG, PNG, or WebP)." };
  }

  const supabase = await createClient();
  const { data: log } = await supabase
    .from("project_job_logs")
    .select("id")
    .eq("id", jobLogId)
    .eq("project_id", projectId)
    .eq("organization_id", context.organizationId)
    .single();

  if (!log) {
    return { error: "Job log not found." };
  }

  const safeName = sanitizeFileName(file.name || "photo.jpg");
  const storagePath = `${context.organizationId}/${projectId}/${jobLogId}/${crypto.randomUUID()}-${safeName}`;
  const fileBuffer = await file.arrayBuffer();

  const { error: uploadError } = await supabase.storage
    .from("project-job-photos")
    .upload(storagePath, fileBuffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    return { error: "We couldn't upload this photo. Try again." };
  }

  const { data: signedData, error: signedError } = await supabase.storage
    .from("project-job-photos")
    .createSignedUrl(storagePath, 60 * 60 * 24 * 365);

  if (signedError || !signedData?.signedUrl) {
    await supabase.storage.from("project-job-photos").remove([storagePath]);
    return { error: "We couldn't finalize the photo upload." };
  }

  const { error: insertError } = await supabase.from("project_job_log_photos").insert({
    job_log_id: jobLogId,
    organization_id: context.organizationId,
    file_name: file.name,
    storage_path: storagePath,
    url: signedData.signedUrl,
    mime_type: file.type,
    file_size: file.size,
  });

  if (insertError) {
    await supabase.storage.from("project-job-photos").remove([storagePath]);
    return { error: "We couldn't save the photo record." };
  }

  revalidateProject(projectId);
  return { success: true };
}

export async function deleteProjectJobLog(projectId: string, jobLogId: string) {
  const { error, context } = await assertProject(projectId);
  if (error || !context) {
    return { error: error ?? "Unable to delete job log." };
  }

  const supabase = await createClient();
  const { data: photos } = await supabase
    .from("project_job_log_photos")
    .select("storage_path")
    .eq("job_log_id", jobLogId);

  const { error: deleteError } = await supabase
    .from("project_job_logs")
    .delete()
    .eq("id", jobLogId)
    .eq("project_id", projectId)
    .eq("organization_id", context.organizationId);

  if (deleteError) {
    return { error: "We couldn't delete this job log." };
  }

  const paths = (photos ?? []).map((photo) => photo.storage_path).filter(Boolean);
  if (paths.length > 0) {
    await supabase.storage.from("project-job-photos").remove(paths);
  }

  revalidateProject(projectId);
  return { success: true };
}
