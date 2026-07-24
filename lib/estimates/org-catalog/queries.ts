import "server-only";

import { parseNumber } from "@/lib/projects/format";
import { createClient } from "@/lib/supabase/server";
import type {
  OrganizationCatalogItem,
  OrganizationCatalogItemInput,
  OrgCatalogCategory,
} from "@/lib/estimates/org-catalog/types";

function mapRow(row: Record<string, unknown>): OrganizationCatalogItem {
  return {
    id: String(row.id),
    organization_id: String(row.organization_id),
    category: String(row.category) as OrgCatalogCategory,
    catalog_item_id: row.catalog_item_id ? String(row.catalog_item_id) : null,
    name: String(row.name),
    default_unit: row.default_unit ? String(row.default_unit) : null,
    default_unit_cost:
      row.default_unit_cost === null || row.default_unit_cost === undefined
        ? null
        : parseNumber(row.default_unit_cost),
    description: row.description ? String(row.description) : null,
    keywords: Array.isArray(row.keywords) ? row.keywords.map(String) : [],
    is_hidden: Boolean(row.is_hidden),
    is_custom: Boolean(row.is_custom),
    sort_order: parseNumber(row.sort_order),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

export async function getOrganizationCatalogItems(
  organizationId: string,
  category: OrgCatalogCategory = "equipment"
) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organization_catalog_items")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("category", category)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    if (error.message.includes("organization_catalog_items")) {
      return [];
    }

    throw new Error(error.message);
  }

  return (data ?? []).map(mapRow);
}

export async function upsertOrganizationCatalogItem(
  organizationId: string,
  category: OrgCatalogCategory,
  input: OrganizationCatalogItemInput
) {
  const supabase = await createClient();
  const payload = {
    organization_id: organizationId,
    category,
    catalog_item_id: input.catalog_item_id ?? null,
    name: input.name.trim(),
    default_unit: input.default_unit?.trim() || null,
    default_unit_cost:
      input.default_unit_cost === null || input.default_unit_cost === undefined
        ? null
        : input.default_unit_cost,
    description: input.description?.trim() || null,
    keywords: input.keywords ?? [],
    is_hidden: input.is_hidden ?? false,
    is_custom: input.is_custom ?? !input.catalog_item_id,
    sort_order: input.sort_order ?? 0,
    updated_at: new Date().toISOString(),
  };

  if (!payload.name) {
    throw new Error("Equipment name is required.");
  }

  if (input.id) {
    const { data, error } = await supabase
      .from("organization_catalog_items")
      .update(payload)
      .eq("id", input.id)
      .eq("organization_id", organizationId)
      .select("*")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return mapRow(data);
  }

  if (payload.catalog_item_id) {
    const { data: existing } = await supabase
      .from("organization_catalog_items")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("category", category)
      .eq("catalog_item_id", payload.catalog_item_id)
      .maybeSingle();

    if (existing?.id) {
      const { data, error } = await supabase
        .from("organization_catalog_items")
        .update(payload)
        .eq("id", existing.id)
        .select("*")
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return mapRow(data);
    }

    const { data, error } = await supabase
      .from("organization_catalog_items")
      .insert(payload)
      .select("*")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return mapRow(data);
  }

  const { data: existing } = await supabase
    .from("organization_catalog_items")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("category", category)
    .is("catalog_item_id", null)
    .ilike("name", payload.name)
    .maybeSingle();

  if (existing?.id) {
    const { data, error } = await supabase
      .from("organization_catalog_items")
      .update(payload)
      .eq("id", existing.id)
      .select("*")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return mapRow(data);
  }

  const { data, error } = await supabase
    .from("organization_catalog_items")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapRow(data);
}

export async function deleteOrganizationCatalogItem(
  organizationId: string,
  itemId: string
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("organization_catalog_items")
    .delete()
    .eq("id", itemId)
    .eq("organization_id", organizationId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function resetOrganizationCatalogOverride(
  organizationId: string,
  catalogItemId: string
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("organization_catalog_items")
    .delete()
    .eq("organization_id", organizationId)
    .eq("category", "equipment")
    .eq("catalog_item_id", catalogItemId);

  if (error) {
    throw new Error(error.message);
  }
}
