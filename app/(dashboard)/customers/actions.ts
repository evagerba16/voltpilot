"use server";

import { revalidatePath } from "next/cache";

import { assertPermission } from "@/lib/auth/get-team-context";
import type { CustomerInput } from "@/lib/customers/types";
import { createClient } from "@/lib/supabase/server";

function parseCustomerInput(formData: FormData): CustomerInput {
  return {
    company_name: String(formData.get("company_name") ?? "").trim(),
    contact_name: String(formData.get("contact_name") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim(),
    phone_number: String(formData.get("phone_number") ?? "").trim(),
    project_address: String(formData.get("project_address") ?? "").trim(),
    notes: String(formData.get("notes") ?? "").trim(),
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

export async function createCustomer(formData: FormData) {
  const context = await assertPermission("customers.edit");
  const input = parseCustomerInput(formData);
  const validationError = validateCustomerInput(input);

  if (validationError) {
    return { error: validationError };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("customers").insert({
    user_id: context.userId,
    organization_id: context.organizationId,
    company_name: input.company_name,
    contact_name: input.contact_name,
    email: input.email,
    phone_number: input.phone_number || null,
    project_address: input.project_address || null,
    notes: input.notes || null,
  });

  if (error) {
    return { error: "We couldn't save this customer. Check your details and try again." };
  }

  revalidatePath("/customers");
  return { success: true };
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
    })
    .eq("id", id)
    .eq("organization_id", context.organizationId);

  if (error) {
    return { error: "We couldn't save this customer. Check your details and try again." };
  }

  revalidatePath("/customers");
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

  revalidatePath("/customers");
  return { success: true };
}
