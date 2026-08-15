import "server-only";

import { parseNumber } from "@/lib/projects/format";
import type {
  ChangeOrderStatus,
  ProjectChangeOrder,
  ProjectFieldData,
  ProjectJobLog,
  ProjectJobLogPhoto,
} from "@/lib/projects/job-costing-types";
import { createClient } from "@/lib/supabase/server";

function mapChangeOrder(row: Record<string, unknown>): ProjectChangeOrder {
  return {
    id: String(row.id),
    project_id: String(row.project_id),
    title: String(row.title),
    description: row.description ? String(row.description) : null,
    status: String(row.status) as ChangeOrderStatus,
    value_change: parseNumber(row.value_change),
    cost_impact: parseNumber(row.cost_impact),
    approved_at: row.approved_at ? String(row.approved_at) : null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

function mapPhoto(row: Record<string, unknown>): ProjectJobLogPhoto {
  return {
    id: String(row.id),
    job_log_id: String(row.job_log_id),
    file_name: String(row.file_name),
    url: String(row.url),
    mime_type: row.mime_type ? String(row.mime_type) : null,
    file_size: row.file_size ? parseNumber(row.file_size) : null,
    created_at: String(row.created_at),
  };
}

function mapJobLog(row: Record<string, unknown>, photos: ProjectJobLogPhoto[]): ProjectJobLog {
  return {
    id: String(row.id),
    project_id: String(row.project_id),
    log_date: String(row.log_date),
    crew_members: String(row.crew_members ?? ""),
    hours_worked: parseNumber(row.hours_worked),
    work_completed: String(row.work_completed ?? ""),
    delays: row.delays ? String(row.delays) : null,
    weather: row.weather ? String(row.weather) : null,
    notes: row.notes ? String(row.notes) : null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
    photos,
  };
}

export async function getProjectChangeOrders(projectId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("project_change_orders")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error) {
    if (error.message.includes("project_change_orders")) {
      return [];
    }
    throw new Error(error.message);
  }

  return (data ?? []).map(mapChangeOrder);
}

export async function getProjectJobLogs(projectId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("project_job_logs")
    .select("*")
    .eq("project_id", projectId)
    .order("log_date", { ascending: false });

  if (error) {
    if (error.message.includes("project_job_logs")) {
      return [];
    }
    throw new Error(error.message);
  }

  const logs = data ?? [];
  if (logs.length === 0) {
    return [];
  }

  const logIds = logs.map((log) => log.id);
  const { data: photos } = await supabase
    .from("project_job_log_photos")
    .select("*")
    .in("job_log_id", logIds)
    .order("created_at", { ascending: true });

  const photosByLog = new Map<string, ProjectJobLogPhoto[]>();
  for (const photo of photos ?? []) {
    const mapped = mapPhoto(photo);
    const existing = photosByLog.get(mapped.job_log_id) ?? [];
    existing.push(mapped);
    photosByLog.set(mapped.job_log_id, existing);
  }

  return logs.map((log) => mapJobLog(log, photosByLog.get(String(log.id)) ?? []));
}

export function buildProjectFieldData(
  changeOrders: ProjectChangeOrder[],
  jobLogs: ProjectJobLog[],
  estimatedLaborHours: number
): ProjectFieldData {
  const approvedChangeOrderValue = changeOrders
    .filter((order) => order.status === "approved")
    .reduce((sum, order) => sum + order.value_change, 0);

  const pendingChangeOrderCount = changeOrders.filter(
    (order) => order.status === "pending" || order.status === "draft"
  ).length;

  const totalLogHours = jobLogs.reduce((sum, log) => sum + log.hours_worked, 0);

  let daysSinceLastLog: number | null = null;
  if (jobLogs.length > 0) {
    const latest = new Date(jobLogs[0].log_date);
    daysSinceLastLog = Math.floor((Date.now() - latest.getTime()) / (1000 * 60 * 60 * 24));
  }

  return {
    changeOrders,
    jobLogs,
    approvedChangeOrderValue,
    pendingChangeOrderCount,
    totalLogHours,
    estimatedLaborHours,
    daysSinceLastLog,
  };
}

export async function syncJobActualsTotal(
  supabase: Awaited<ReturnType<typeof createClient>>,
  projectId: string,
  organizationId: string,
  values: {
    actual_labor: number;
    actual_materials: number;
    actual_equipment: number;
    actual_subcontractors: number;
    actual_miscellaneous: number;
    change_order_count: number;
  }
) {
  const actual_total =
    values.actual_labor +
    values.actual_materials +
    values.actual_equipment +
    values.actual_subcontractors +
    values.actual_miscellaneous;

  const { data: existing } = await supabase
    .from("project_job_actuals")
    .select("id")
    .eq("project_id", projectId)
    .maybeSingle();

  const payload = {
    ...values,
    actual_total,
    recorded_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (existing?.id) {
    await supabase.from("project_job_actuals").update(payload).eq("id", existing.id);
    return;
  }

  await supabase.from("project_job_actuals").insert({
    project_id: projectId,
    organization_id: organizationId,
    ...payload,
  });
}
