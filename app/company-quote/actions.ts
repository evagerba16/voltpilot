"use server";

import { redirect } from "next/navigation";

import {
  CONTRACTOR_COUNT_RANGES,
  type ContractorCountRange,
} from "@/lib/b2b/types";
import { assertValidEmail } from "@/lib/security/url-validation";
import { createAdminClient, isAdminClientConfigured } from "@/lib/supabase/admin";

function isContractorCountRange(value: string): value is ContractorCountRange {
  return CONTRACTOR_COUNT_RANGES.includes(value as ContractorCountRange);
}

export async function submitCompanyQuoteRequest(formData: FormData) {
  const companyName = String(formData.get("company_name") ?? "").trim();
  const contactName = String(formData.get("contact_name") ?? "").trim();
  const workEmailRaw = String(formData.get("work_email") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const contractorCountRange = String(formData.get("contractor_count_range") ?? "").trim();
  const goals = String(formData.get("goals") ?? "").trim();

  if (!companyName) {
    return { error: "Enter your company name." };
  }

  if (!contactName) {
    return { error: "Enter your name." };
  }

  const workEmail = assertValidEmail(workEmailRaw);

  if (!workEmail) {
    return { error: "Enter a valid work email address." };
  }

  if (!isContractorCountRange(contractorCountRange)) {
    return { error: "Select how many contractors are on your team." };
  }

  if (goals.length < 10) {
    return { error: "Tell us a bit more about what you want to accomplish." };
  }

  if (goals.length > 2000) {
    return { error: "Please keep your response under 2,000 characters." };
  }

  if (!isAdminClientConfigured()) {
    return {
      error:
        "Quote requests are temporarily unavailable. Email our team from the contact section instead.",
    };
  }

  try {
    const admin = createAdminClient();
    const { error } = await admin.from("company_quote_requests").insert({
      company_name: companyName,
      contact_name: contactName,
      work_email: workEmail,
      phone: phone || null,
      contractor_count_range: contractorCountRange,
      goals,
      status: "pending",
    });

    if (error) {
      return { error: "We couldn't save your request. Try again in a moment." };
    }
  } catch {
    return { error: "We couldn't save your request. Try again in a moment." };
  }

  redirect("/company-quote/success");
}
