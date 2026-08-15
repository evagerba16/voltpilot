"use server";

import { revalidatePath } from "next/cache";

import { assertPermission } from "@/lib/auth/get-team-context";
import { getCustomerById } from "@/lib/customers/queries";
import type { CustomerDocumentCategory, CustomerInput, CustomerStatus } from "@/lib/customers/types";
import { CUSTOMER_DOCUMENT_MAX_BYTES } from "@/lib/customers/types";
import { createClient } from "@/lib/supabase/server";

function parseCustomerInput(formData: FormData): CustomerInput {
  const status = String(formData.get("status") ?? "lead").trim() as CustomerStatus;
  return {
    company_name: String(formData.get("company_name") ?? "").trim(),
    contact_name: String(formData.get("contact_name") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim(),
    phone_number: String(formData.get("phone_number") ?? "").trim(),
    project_address: String(formData.get("project_address") ?? "").trim(),
    notes: String(formData.get("notes") ?? "").trim(),
    status: ["lead", "prospect", "active", "completed", "archived"].includes(status)
      ? status
      : "lead",
  };
}

function validateCustomerInput(input: CustomerInput) {
  if (!input.company_name) return "Company name is required.";
  if (!input.contact_name) return "Contact name is required.";
  if (!input.email) return "Email is required.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) {
    return "Enter a valid email address.";
  }
  return null;
}

function customerHasProjectsMessage(companyName: string, projectCount: number) {
  if (projectCount === 1) {
    return `${companyName} still has a project on file. Remove or reassign it before deleting this customer.`;
  }

  return `${companyName} still has ${projectCount} projects on file. Remove or reassign them before deleting this customer.`;
}

function isCustomerProjectsForeignKeyViolation(error: {
  code?: string;
  message?: string;
}) {
  return (
    error.code === "23503" ||
    error.message?.includes("violates foreign key constraint") ||
    error.message?.includes("projects_customer_id_fkey")
  );
}

function revalidateCustomerPaths(customerId?: string) {
  revalidatePath("/customers");
  if (customerId) {
    revalidatePath(`/customers/${customerId}`);
  }
}

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 180);
}

async function assertCustomerInOrg(customerId: string, organizationId: string) {
  const customer = await getCustomerById(customerId);

  if (!customer || customer.organization_id !== organizationId) {
    return null;
  }

  return customer;
}

export async function createCustomer(formData: FormData) {
  const context = await assertPermission("customers.edit");
  const input = parseCustomerInput(formData);
  const validationError = validateCustomerInput(input);

  if (validationError) {
    return { error: validationError };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customers")
    .insert({
      user_id: context.userId,
      organization_id: context.organizationId,
      company_name: input.company_name,
      contact_name: input.contact_name,
      email: input.email,
      phone_number: input.phone_number || null,
      project_address: input.project_address || null,
      notes: input.notes || null,
      status: input.status,
    })
    .select("id")
    .single();

  if (error) {
    return { error: "We couldn't save this customer. Check your details and try again." };
  }

  revalidateCustomerPaths(data.id);
  return { success: true, id: data.id };
}

export async function updateCustomer(id: string, formData: FormData) {
  const context = await assertPermission("customers.edit");
  const input = parseCustomerInput(formData);
  const validationError = validateCustomerInput(input);

  if (validationError) {
    return { error: validationError };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("customers")
    .update({
      company_name: input.company_name,
      contact_name: input.contact_name,
      email: input.email,
      phone_number: input.phone_number || null,
      project_address: input.project_address || null,
      notes: input.notes || null,
      status: input.status,
    })
    .eq("id", id)
    .eq("organization_id", context.organizationId);

  if (error) {
    return { error: "We couldn't save this customer. Check your details and try again." };
  }

  revalidateCustomerPaths(id);
  return { success: true };
}

export async function deleteCustomer(id: string) {
  const context = await assertPermission("customers.edit");

  const supabase = await createClient();

  const { data: customer, error: customerError } = await supabase
    .from("customers")
    .select("company_name")
    .eq("id", id)
    .eq("organization_id", context.organizationId)
    .maybeSingle();

  if (customerError || !customer) {
    return {
      error: "This customer couldn't be found. Refresh the page and try again.",
    };
  }

  const { count: linkedProjectCount, error: projectCountError } = await supabase
    .from("projects")
    .select("id", { count: "exact", head: true })
    .eq("customer_id", id)
    .eq("organization_id", context.organizationId);

  if (projectCountError) {
    return {
      error: "We couldn't check this customer's projects. Try again in a moment.",
    };
  }

  if ((linkedProjectCount ?? 0) > 0) {
    return {
      error: customerHasProjectsMessage(
        customer.company_name,
        linkedProjectCount ?? 0
      ),
    };
  }

  const { error } = await supabase
    .from("customers")
    .delete()
    .eq("id", id)
    .eq("organization_id", context.organizationId);

  if (error) {
    if (isCustomerProjectsForeignKeyViolation(error)) {
      return {
        error: customerHasProjectsMessage(
          customer.company_name,
          Math.max(linkedProjectCount ?? 0, 1)
        ),
      };
    }

    return {
      error: `We couldn't remove ${customer.company_name}. Try again in a moment.`,
    };
  }

  revalidateCustomerPaths();
  return { success: true };
}

export async function addCustomerNote(customerId: string, formData: FormData) {
  const context = await assertPermission("customers.edit");
  const body = String(formData.get("body") ?? "").trim();

  if (!body) {
    return { error: "Enter a note before saving." };
  }

  const customer = await assertCustomerInOrg(customerId, context.organizationId);

  if (!customer) {
    return { error: "This customer couldn't be found." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("customer_notes").insert({
    customer_id: customerId,
    organization_id: context.organizationId,
    user_id: context.userId,
    body,
  });

  if (error) {
    return { error: "We couldn't save this note. Try again in a moment." };
  }

  revalidateCustomerPaths(customerId);
  return { success: true };
}

export async function deleteCustomerNote(customerId: string, noteId: string) {
  const context = await assertPermission("customers.edit");
  const customer = await assertCustomerInOrg(customerId, context.organizationId);

  if (!customer) {
    return { error: "This customer couldn't be found." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("customer_notes")
    .delete()
    .eq("id", noteId)
    .eq("customer_id", customerId)
    .eq("organization_id", context.organizationId);

  if (error) {
    return { error: "We couldn't delete this note. Try again in a moment." };
  }

  revalidateCustomerPaths(customerId);
  return { success: true };
}

export async function updateCustomerNote(
  customerId: string,
  noteId: string,
  formData: FormData
) {
  const context = await assertPermission("customers.edit");
  const body = String(formData.get("body") ?? "").trim();

  if (!body) {
    return { error: "Enter a note before saving." };
  }

  const customer = await assertCustomerInOrg(customerId, context.organizationId);
  if (!customer) {
    return { error: "This customer couldn't be found." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("customer_notes")
    .update({ body, updated_at: new Date().toISOString() })
    .eq("id", noteId)
    .eq("customer_id", customerId)
    .eq("organization_id", context.organizationId);

  if (error) {
    return { error: "We couldn't update this note. Try again in a moment." };
  }

  revalidateCustomerPaths(customerId);
  return { success: true };
}

export async function toggleCustomerNotePin(customerId: string, noteId: string) {
  const context = await assertPermission("customers.edit");
  const customer = await assertCustomerInOrg(customerId, context.organizationId);

  if (!customer) {
    return { error: "This customer couldn't be found." };
  }

  const supabase = await createClient();
  const { data: note, error: fetchError } = await supabase
    .from("customer_notes")
    .select("is_pinned")
    .eq("id", noteId)
    .eq("customer_id", customerId)
    .eq("organization_id", context.organizationId)
    .maybeSingle();

  if (fetchError || !note) {
    return { error: "This note couldn't be found." };
  }

  const { error } = await supabase
    .from("customer_notes")
    .update({ is_pinned: !note.is_pinned, updated_at: new Date().toISOString() })
    .eq("id", noteId)
    .eq("customer_id", customerId)
    .eq("organization_id", context.organizationId);

  if (error) {
    return { error: "We couldn't update this note. Try again in a moment." };
  }

  revalidateCustomerPaths(customerId);
  return { success: true };
}

export async function uploadCustomerDocument(customerId: string, formData: FormData) {
  const context = await assertPermission("customers.edit");
  const customer = await assertCustomerInOrg(customerId, context.organizationId);

  if (!customer) {
    return { error: "This customer couldn't be found." };
  }

  const category = String(formData.get("category") ?? "other").trim() as CustomerDocumentCategory;
  const allowedCategories = new Set([
    "contract",
    "photo",
    "permit",
    "warranty",
    "blueprint",
    "inspection",
    "other",
  ]);

  const file = formData.get("file");

  if (!(file instanceof File) || file.size <= 0) {
    return { error: "Choose a file to upload." };
  }

  if (file.size > CUSTOMER_DOCUMENT_MAX_BYTES) {
    return { error: "Files must be 10 MB or smaller." };
  }

  const safeName = sanitizeFileName(file.name || "document");
  const storagePath = `${context.organizationId}/${customerId}/${crypto.randomUUID()}-${safeName}`;
  const supabase = await createClient();
  const fileBuffer = await file.arrayBuffer();

  const { error: uploadError } = await supabase.storage
    .from("customer-documents")
    .upload(storagePath, fileBuffer, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

  if (uploadError) {
    return { error: "We couldn't upload this file. Try again in a moment." };
  }

  const { data: signedData, error: signedError } = await supabase.storage
    .from("customer-documents")
    .createSignedUrl(storagePath, 60 * 60 * 24 * 7);

  if (signedError || !signedData?.signedUrl) {
    await supabase.storage.from("customer-documents").remove([storagePath]);
    return { error: "We couldn't finalize the upload. Try again in a moment." };
  }

  const { error: insertError } = await supabase.from("customer_documents").insert({
    customer_id: customerId,
    organization_id: context.organizationId,
    user_id: context.userId,
    file_name: file.name,
    url: signedData.signedUrl,
    storage_path: storagePath,
    mime_type: file.type || null,
    file_size: file.size,
    category: allowedCategories.has(category) ? category : "other",
  });

  if (insertError) {
    await supabase.storage.from("customer-documents").remove([storagePath]);
    return { error: "We couldn't save the document record. Try again in a moment." };
  }

  revalidateCustomerPaths(customerId);
  return { success: true };
}

export async function deleteCustomerDocument(
  customerId: string,
  documentId: string
) {
  const context = await assertPermission("customers.edit");
  const customer = await assertCustomerInOrg(customerId, context.organizationId);

  if (!customer) {
    return { error: "This customer couldn't be found." };
  }

  const supabase = await createClient();
  const { data: document, error: fetchError } = await supabase
    .from("customer_documents")
    .select("storage_path")
    .eq("id", documentId)
    .eq("customer_id", customerId)
    .eq("organization_id", context.organizationId)
    .maybeSingle();

  if (fetchError || !document) {
    return { error: "This document couldn't be found." };
  }

  if (document.storage_path) {
    await supabase.storage
      .from("customer-documents")
      .remove([document.storage_path]);
  }

  const { error } = await supabase
    .from("customer_documents")
    .delete()
    .eq("id", documentId)
    .eq("customer_id", customerId)
    .eq("organization_id", context.organizationId);

  if (error) {
    return { error: "We couldn't delete this document. Try again in a moment." };
  }

  revalidateCustomerPaths(customerId);
  return { success: true };
}

export async function getCustomerDocumentDownloadUrl(
  customerId: string,
  documentId: string
) {
  await assertPermission("customers.view");

  const supabase = await createClient();
  const { data: document, error } = await supabase
    .from("customer_documents")
    .select("storage_path, url")
    .eq("id", documentId)
    .eq("customer_id", customerId)
    .maybeSingle();

  if (error || !document) {
    return { error: "This document couldn't be found." };
  }

  if (!document.storage_path) {
    return { url: document.url };
  }

  const { data, error: signedError } = await supabase.storage
    .from("customer-documents")
    .createSignedUrl(document.storage_path, 60 * 60);

  if (signedError || !data?.signedUrl) {
    return { error: "We couldn't open this document. Try again in a moment." };
  }

  return { url: data.signedUrl };
}
