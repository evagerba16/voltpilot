import "server-only";

import { createClient } from "@/lib/supabase/server";

export type SearchResult = {
  id: string;
  type: "project" | "customer" | "estimate" | "proposal";
  title: string;
  subtitle?: string;
  href: string;
};

function escapeIlike(value: string) {
  return value.replace(/[%_\\]/g, "\\$&");
}

export async function globalSearch(
  query: string,
  limit = 5
): Promise<SearchResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) {
    return [];
  }

  const supabase = await createClient();
  const term = `%${escapeIlike(trimmed)}%`;

  const [projectsRes, customersRes, estimatesRes, proposalsRes] =
    await Promise.all([
      supabase
        .from("projects")
        .select("id, project_name, customer:customers(company_name)")
        .ilike("project_name", term)
        .is("archived_at", null)
        .limit(limit),
      supabase
        .from("customers")
        .select("id, company_name, contact_name")
        .or(`company_name.ilike.${term},contact_name.ilike.${term},email.ilike.${term}`)
        .limit(limit),
      supabase
        .from("estimates")
        .select("id, title, project:projects(project_name)")
        .ilike("title", term)
        .limit(limit),
      supabase
        .from("proposals")
        .select("id, title, proposal_number, project:projects(project_name)")
        .or(`title.ilike.${term},proposal_number.ilike.${term}`)
        .limit(limit),
    ]);

  const results: SearchResult[] = [];

  for (const project of projectsRes.data ?? []) {
    const customer = Array.isArray(project.customer)
      ? project.customer[0]
      : project.customer;
    results.push({
      id: project.id,
      type: "project",
      title: project.project_name,
      subtitle: customer?.company_name ?? undefined,
      href: `/projects/${project.id}`,
    });
  }

  for (const customer of customersRes.data ?? []) {
    results.push({
      id: customer.id,
      type: "customer",
      title: customer.company_name,
      subtitle: customer.contact_name,
      href: `/customers?q=${encodeURIComponent(customer.company_name)}`,
    });
  }

  for (const estimate of estimatesRes.data ?? []) {
    const project = Array.isArray(estimate.project)
      ? estimate.project[0]
      : estimate.project;
    results.push({
      id: estimate.id,
      type: "estimate",
      title: estimate.title,
      subtitle: project?.project_name ?? undefined,
      href: `/estimates/${estimate.id}`,
    });
  }

  for (const proposal of proposalsRes.data ?? []) {
    const project = Array.isArray(proposal.project)
      ? proposal.project[0]
      : proposal.project;
    results.push({
      id: proposal.id,
      type: "proposal",
      title: proposal.title,
      subtitle: proposal.proposal_number ?? project?.project_name ?? undefined,
      href: `/proposals/${proposal.id}`,
    });
  }

  return results.slice(0, limit * 2);
}
