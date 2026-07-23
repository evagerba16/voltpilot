"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { assertPermission } from "@/lib/auth/get-team-context";
import { calculateEstimateTotals, roundCurrency } from "@/lib/estimates/calculations";
import {
  ESTIMATE_CATEGORIES,
  type EstimateBuilderState,
  type EstimateCategory,
  type EstimateLineItemInput,
} from "@/lib/estimates/types";
import { normalizeUnitForCategory } from "@/lib/estimates/units";
import {
  verifyEstimateOwnership,
  verifyProjectOwnership,
  getEstimateById,
  getEstimateVersions,
  mapEstimateToBuilderState,
} from "@/lib/estimates/queries";
import { createClient } from "@/lib/supabase/server";

type SaveOptions = {
  createVersion?: boolean;
  versionLabel?: string;
  isAutosave?: boolean;
};

function parsePercent(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function parseLineItems(value: unknown): EstimateLineItemInput[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const items: EstimateLineItemInput[] = [];

  value.forEach((item, index) => {
    if (!item || typeof item !== "object") {
      return;
    }

    const record = item as Record<string, unknown>;
    const category = String(record.category ?? "");

    if (!ESTIMATE_CATEGORIES.includes(category as EstimateCategory)) {
      return;
    }

    const quantity = Number(record.quantity);
    const unitCost = Number(record.unit_cost);

    items.push({
      id: typeof record.id === "string" ? record.id : undefined,
      category: category as EstimateCategory,
      description: String(record.description ?? "").trim(),
      quantity: Number.isFinite(quantity) && quantity >= 0 ? quantity : 0,
      unit: normalizeUnitForCategory(
        category as EstimateCategory,
        typeof record.unit === "string" ? record.unit : ""
      ),
      unit_cost: Number.isFinite(unitCost) && unitCost >= 0 ? unitCost : 0,
      sort_order:
        Number.isFinite(Number(record.sort_order)) && Number(record.sort_order) >= 0
          ? Number(record.sort_order)
          : index,
    });
  });

  return items;
}

function parseBuilderState(payload: EstimateBuilderState) {
  return {
    title: payload.title.trim(),
    notes: payload.notes.trim(),
    overhead_percent: parsePercent(payload.overhead_percent),
    contingency_percent: parsePercent(payload.contingency_percent),
    tax_percent: parsePercent(payload.tax_percent),
    profit_margin_percent: parsePercent(payload.profit_margin_percent),
    line_items: parseLineItems(payload.line_items).filter(
      (item) =>
        item.description ||
        item.quantity > 0 ||
        item.unit_cost > 0
    ),
  };
}

async function getNextVersionNumber(
  supabase: Awaited<ReturnType<typeof createClient>>,
  estimateId: string
) {
  const { data, error } = await supabase
    .from("estimate_versions")
    .select("version_number")
    .eq("estimate_id", estimateId)
    .order("version_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    if (error.message.includes("estimate_versions")) {
      return 1;
    }

    throw new Error(error.message);
  }

  return (data?.version_number ?? 0) + 1;
}

async function persistEstimate(
  estimateId: string,
  payload: EstimateBuilderState,
  options: SaveOptions = {}
) {
  const context = await assertPermission("estimates.edit");

  const ownsEstimate = await verifyEstimateOwnership(estimateId, context.organizationId);

  if (!ownsEstimate) {
    return { error: "This estimate could not be found." };
  }

  const supabase = await createClient();
  const { data: existingEstimate, error: statusError } = await supabase
    .from("estimates")
    .select("status")
    .eq("id", estimateId)
    .eq("organization_id", context.organizationId)
    .maybeSingle();

  if (statusError) {
    return { error: "We couldn't save this estimate. Try again in a moment." };
  }

  if (existingEstimate?.status === "Final") {
    return {
      error: "This estimate is final. Reopen it before making changes.",
    };
  }

  const input = parseBuilderState(payload);

  if (!input.title) {
    return { error: "Enter an estimate title." };
  }

  const totals = calculateEstimateTotals(
    input.line_items,
    input.overhead_percent,
    input.contingency_percent,
    input.profit_margin_percent,
    input.tax_percent
  );

  const sellingPrice = roundCurrency(totals.finalSellingPrice);

  const estimateUpdate = {
    title: input.title,
    notes: input.notes || null,
    overhead_percent: input.overhead_percent,
    contingency_percent: input.contingency_percent,
    markup_percent: input.contingency_percent,
    tax_percent: input.tax_percent,
    profit_margin_percent: input.profit_margin_percent,
    direct_cost_total: roundCurrency(totals.directCost),
    labor_total: roundCurrency(totals.laborTotal),
    materials_total: roundCurrency(totals.materialsTotal),
    equipment_total: roundCurrency(totals.equipmentTotal),
    subcontractors_total: roundCurrency(totals.subcontractorsTotal),
    miscellaneous_total: roundCurrency(totals.miscellaneousTotal),
    overhead_amount: roundCurrency(totals.overheadAmount),
    contingency_amount: roundCurrency(totals.contingencyAmount),
    markup_amount: roundCurrency(totals.contingencyAmount),
    profit_amount: roundCurrency(totals.profitAmount),
    tax_amount: roundCurrency(totals.taxAmount),
    gross_margin_percent: roundCurrency(totals.grossMarginPercent),
    selling_price: sellingPrice,
    grand_total: sellingPrice,
    ...(options.isAutosave ? { last_autosaved_at: new Date().toISOString() } : {}),
  };

  const { error: estimateError } = await supabase
    .from("estimates")
    .update(estimateUpdate)
    .eq("id", estimateId)
    .eq("organization_id", context.organizationId);

  if (estimateError) {
    return { error: "We couldn't save this estimate. Try again in a moment." };
  }

  const lineItemsWithIds = input.line_items.map((item) => ({
    ...item,
    id: item.id ?? crypto.randomUUID(),
  }));

  if (lineItemsWithIds.length > 0) {
    const { error: upsertError } = await supabase.from("estimate_line_items").upsert(
      lineItemsWithIds.map((item) => ({
        id: item.id,
        estimate_id: estimateId,
        category: item.category,
        description: item.description,
        quantity: item.quantity,
        unit: item.unit,
        unit_cost: item.unit_cost,
        sort_order: item.sort_order,
      })),
      { onConflict: "id" }
    );

    if (upsertError) {
      return { error: "We couldn't save this estimate. Try again in a moment." };
    }
  }

  const keptIds = lineItemsWithIds.map((item) => item.id);
  const { data: existingRows, error: fetchLineItemsError } = await supabase
    .from("estimate_line_items")
    .select("id")
    .eq("estimate_id", estimateId);

  if (fetchLineItemsError) {
    return { error: "We couldn't save this estimate. Try again in a moment." };
  }

  const keptIdSet = new Set(keptIds);
  const orphanIds = (existingRows ?? [])
    .map((row) => row.id as string)
    .filter((id) => !keptIdSet.has(id));

  if (orphanIds.length > 0) {
    const { error: deleteError } = await supabase
      .from("estimate_line_items")
      .delete()
      .in("id", orphanIds);

    if (deleteError) {
      return { error: "We couldn't save this estimate. Try again in a moment." };
    }
  }

  if (options.createVersion) {
    const versionNumber = await getNextVersionNumber(supabase, estimateId);
    const { error: versionError } = await supabase
      .from("estimate_versions")
      .insert({
        estimate_id: estimateId,
        user_id: context.userId,
        organization_id: context.organizationId,
        version_number: versionNumber,
        label: options.versionLabel ?? "Manual save",
        snapshot: input,
      });

    if (versionError && !versionError.message.includes("estimate_versions")) {
      return { error: "We couldn't save this estimate. Try again in a moment." };
    }
  }

  if (!options.isAutosave) {
    revalidatePath("/estimates");
    revalidatePath(`/estimates/${estimateId}`);
  }

  return {
    success: true,
    savedAt: new Date().toISOString(),
    sellingPrice,
  };
}

export async function createEstimate(projectId: string) {
  const context = await assertPermission("estimates.edit");

  const project = await verifyProjectOwnership(projectId, context.organizationId);

  if (!project) {
    return { error: "This project could not be found." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("estimates")
    .insert({
      user_id: context.userId,
      organization_id: context.organizationId,
      project_id: projectId,
      title: `${project.project_name} Estimate`,
    })
    .select("id")
    .single();

  if (error) {
    return { error: "We couldn't create this estimate. Try again in a moment." };
  }

  revalidatePath("/estimates");
  redirect(`/estimates/${data.id}`);
}

export async function saveEstimate(
  estimateId: string,
  payload: EstimateBuilderState
) {
  return persistEstimate(estimateId, payload, {
    createVersion: true,
    versionLabel: "Manual save",
  });
}

export async function saveAiEstimateVersion(
  estimateId: string,
  payload: EstimateBuilderState
) {
  return persistEstimate(estimateId, payload, {
    createVersion: true,
    versionLabel: "AI generated",
  });
}

export async function autosaveEstimate(
  estimateId: string,
  payload: EstimateBuilderState
) {
  return persistEstimate(estimateId, payload, {
    isAutosave: true,
  });
}

export async function restoreEstimateVersion(
  estimateId: string,
  versionId: string
) {
  const context = await assertPermission("estimates.edit");

  const ownsEstimate = await verifyEstimateOwnership(estimateId, context.organizationId);

  if (!ownsEstimate) {
    return { error: "This estimate could not be found." };
  }

  const supabase = await createClient();
  const { data: version, error } = await supabase
    .from("estimate_versions")
    .select("*")
    .eq("id", versionId)
    .eq("estimate_id", estimateId)
    .eq("organization_id", context.organizationId)
    .single();

  if (error || !version) {
    return { error: "This version could not be found." };
  }

  const snapshot = version.snapshot as EstimateBuilderState;
  const result = await persistEstimate(estimateId, snapshot, {
    createVersion: true,
    versionLabel: `Restored from v${version.version_number}`,
  });

  if (result.error) {
    return result;
  }

  return {
    success: true,
    state: snapshot,
    savedAt: result.savedAt,
  };
}

export async function fetchEstimateVersions(estimateId: string) {
  const context = await assertPermission("estimates.view");

  const ownsEstimate = await verifyEstimateOwnership(estimateId, context.organizationId);

  if (!ownsEstimate) {
    return { error: "This estimate could not be found." };
  }

  const versions = await getEstimateVersions(estimateId);
  return { success: true, versions };
}

export async function deleteEstimate(estimateId: string) {
  const context = await assertPermission("estimates.edit");

  const supabase = await createClient();
  const { error } = await supabase
    .from("estimates")
    .delete()
    .eq("id", estimateId)
    .eq("organization_id", context.organizationId);

  if (error) {
    return { error: "We couldn't delete this estimate. Try again in a moment." };
  }

  revalidatePath("/estimates");
  redirect("/estimates");
}

export async function duplicateEstimate(estimateId: string) {
  const context = await assertPermission("estimates.edit");

  const ownsEstimate = await verifyEstimateOwnership(
    estimateId,
    context.organizationId
  );

  if (!ownsEstimate) {
    return { error: "This estimate could not be found." };
  }

  const result = await getEstimateById(estimateId);

  if (!result) {
    return { error: "This estimate could not be found." };
  }

  const { estimate, lineItems } = result;
  const supabase = await createClient();
  const copyTitle = `${estimate.title} (copy)`;

  const { data, error } = await supabase
    .from("estimates")
    .insert({
      user_id: context.userId,
      organization_id: context.organizationId,
      project_id: estimate.project_id,
      title: copyTitle,
      status: "Draft",
      notes: estimate.notes,
      overhead_percent: estimate.overhead_percent,
      contingency_percent: estimate.contingency_percent,
      markup_percent: estimate.contingency_percent,
      tax_percent: estimate.tax_percent,
      profit_margin_percent: estimate.profit_margin_percent,
      direct_cost_total: estimate.direct_cost_total,
      labor_total: estimate.labor_total,
      materials_total: estimate.materials_total,
      equipment_total: estimate.equipment_total,
      subcontractors_total: estimate.subcontractors_total,
      miscellaneous_total: estimate.miscellaneous_total,
      overhead_amount: estimate.overhead_amount,
      contingency_amount: estimate.contingency_amount,
      markup_amount: estimate.contingency_amount,
      profit_amount: estimate.profit_amount,
      tax_amount: estimate.tax_amount,
      gross_margin_percent: estimate.gross_margin_percent,
      selling_price: estimate.selling_price,
      grand_total: estimate.grand_total,
    })
    .select("id")
    .single();

  if (error) {
    return { error: "We couldn't duplicate this estimate. Try again in a moment." };
  }

  if (lineItems.length > 0) {
    const { error: lineItemsError } = await supabase
      .from("estimate_line_items")
      .insert(
        lineItems.map((item) => ({
          estimate_id: data.id,
          category: item.category,
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          unit_cost: item.unit_cost,
          sort_order: item.sort_order,
        }))
      );

    if (lineItemsError) {
      return { error: "We couldn't duplicate this estimate. Try again in a moment." };
    }
  }

  const snapshot = mapEstimateToBuilderState(
    { ...estimate, title: copyTitle },
    lineItems
  );

  const { error: versionError } = await supabase.from("estimate_versions").insert({
    estimate_id: data.id,
    user_id: context.userId,
    organization_id: context.organizationId,
    version_number: 1,
    label: "Duplicated",
    snapshot,
  });

  if (versionError && !versionError.message.includes("estimate_versions")) {
    return { error: "We couldn't duplicate this estimate. Try again in a moment." };
  }

  revalidatePath("/estimates");
  redirect(`/estimates/${data.id}`);
}

export async function finalizeEstimate(estimateId: string) {
  const context = await assertPermission("estimates.edit");

  const ownsEstimate = await verifyEstimateOwnership(
    estimateId,
    context.organizationId
  );

  if (!ownsEstimate) {
    return { error: "This estimate could not be found." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("estimates")
    .update({ status: "Final" })
    .eq("id", estimateId)
    .eq("organization_id", context.organizationId);

  if (error) {
    return { error: "We couldn't mark this estimate as final. Try again in a moment." };
  }

  revalidatePath("/estimates");
  revalidatePath(`/estimates/${estimateId}`);

  return { success: true, status: "Final" as const };
}

export async function reopenEstimate(estimateId: string) {
  const context = await assertPermission("estimates.edit");

  const ownsEstimate = await verifyEstimateOwnership(
    estimateId,
    context.organizationId
  );

  if (!ownsEstimate) {
    return { error: "This estimate could not be found." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("estimates")
    .update({ status: "Draft" })
    .eq("id", estimateId)
    .eq("organization_id", context.organizationId);

  if (error) {
    return { error: "We couldn't reopen this estimate. Try again in a moment." };
  }

  revalidatePath("/estimates");
  revalidatePath(`/estimates/${estimateId}`);

  return { success: true, status: "Draft" as const };
}
