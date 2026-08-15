import type {
  Customer,
  CustomerDocument,
  CustomerEstimateSummary,
  CustomerNote,
  CustomerProjectSummary,
  CustomerTimelineEvent,
} from "@/lib/customers/types";

type ProposalRow = {
  id: string;
  title: string;
  status: string;
  sent_at: string | null;
  accepted_at: string | null;
  first_viewed_at: string | null;
  created_at: string;
  updated_at: string;
  project: { project_name?: string } | Array<{ project_name?: string }> | null;
};

type ProposalViewRow = {
  id: string;
  proposal_id: string;
  viewed_at: string;
  proposal: { title?: string } | Array<{ title?: string }> | null;
};

function normalizeRelation<T>(value: unknown): T | undefined {
  if (Array.isArray(value)) {
    return value[0] as T | undefined;
  }

  return value as T | undefined;
}

export function buildCustomerTimeline({
  customer,
  notes,
  documents,
  projects,
  proposals,
  proposalViews,
  estimates,
}: {
  customer: Customer;
  notes: CustomerNote[];
  documents: CustomerDocument[];
  projects: CustomerProjectSummary[];
  proposals: ProposalRow[];
  proposalViews: ProposalViewRow[];
  estimates: CustomerEstimateSummary[];
}): CustomerTimelineEvent[] {
  const events: CustomerTimelineEvent[] = [
    {
      id: `customer-created-${customer.id}`,
      type: "customer_created",
      title: "Customer created",
      description: `${customer.company_name} was added to your directory.`,
      timestamp: customer.created_at,
      href: `/customers/${customer.id}`,
    },
  ];

  if (customer.updated_at !== customer.created_at) {
    events.push({
      id: `customer-updated-${customer.updated_at}`,
      type: "customer_updated",
      title: "Profile updated",
      description: "Contact details or summary notes were changed.",
      timestamp: customer.updated_at,
      href: `/customers/${customer.id}`,
    });
  }

  for (const note of notes) {
    events.push({
      id: `note-${note.id}`,
      type: "note_added",
      title: note.is_pinned ? "Note pinned" : "Note added",
      description: note.body.length > 120 ? `${note.body.slice(0, 117)}...` : note.body,
      timestamp: note.created_at,
      href: `/customers/${customer.id}#notes`,
    });
  }

  for (const document of documents) {
    events.push({
      id: `document-${document.id}`,
      type: "document_uploaded",
      title: "File uploaded",
      description: document.file_name,
      timestamp: document.created_at,
      href: `/customers/${customer.id}#documents`,
    });
  }

  for (const estimate of estimates) {
    events.push({
      id: `estimate-${estimate.id}`,
      type: "estimate_created",
      title: "Estimate created",
      description: `${estimate.title} · ${estimate.project_name}`,
      timestamp: estimate.updated_at,
      href: `/estimates/${estimate.id}`,
    });
  }

  for (const project of projects) {
    events.push({
      id: `project-${project.id}`,
      type: "project_created",
      title: "Project linked",
      description: project.project_name,
      timestamp: project.updated_at,
      href: `/projects/${project.id}`,
    });

    if (["Awarded", "In Progress", "Completed"].includes(project.status)) {
      events.push({
        id: `project-started-${project.id}`,
        type: "project_started",
        title: "Project started",
        description: `${project.project_name} moved to ${project.status}.`,
        timestamp: project.updated_at,
        href: `/projects/${project.id}`,
      });
    }
  }

  for (const proposal of proposals) {
    const project = normalizeRelation<{ project_name?: string }>(proposal.project);

    if (proposal.sent_at) {
      events.push({
        id: `proposal-sent-${proposal.id}`,
        type: "proposal_sent",
        title: "Proposal sent",
        description: `${proposal.title}${project?.project_name ? ` · ${project.project_name}` : ""}`,
        timestamp: proposal.sent_at,
        href: `/proposals/${proposal.id}`,
      });
    }

    if (proposal.first_viewed_at) {
      events.push({
        id: `proposal-viewed-${proposal.id}`,
        type: "proposal_viewed",
        title: "Proposal viewed",
        description: `${proposal.title} was opened in the client portal.`,
        timestamp: proposal.first_viewed_at,
        href: `/proposals/${proposal.id}`,
      });
    }

    if (proposal.accepted_at) {
      events.push({
        id: `proposal-accepted-${proposal.id}`,
        type: "proposal_accepted",
        title: "Proposal accepted",
        description: `${proposal.title}${project?.project_name ? ` · ${project.project_name}` : ""}`,
        timestamp: proposal.accepted_at,
        href: `/proposals/${proposal.id}`,
      });

      events.push({
        id: `invoice-paid-${proposal.id}`,
        type: "invoice_paid",
        title: "Work awarded",
        description: `Accepted proposal ready for billing follow-up.`,
        timestamp: proposal.accepted_at,
        href: `/proposals/${proposal.id}`,
      });
    }
  }

  for (const view of proposalViews) {
    const proposal = normalizeRelation<{ title?: string }>(view.proposal);
    events.push({
      id: `proposal-view-event-${view.id}`,
      type: "proposal_viewed",
      title: "Proposal viewed",
      description: proposal?.title
        ? `${proposal.title} was viewed in the portal.`
        : "A proposal was viewed in the portal.",
      timestamp: view.viewed_at,
      href: `/customers/${customer.id}#timeline`,
    });
  }

  const deduped = new Map<string, CustomerTimelineEvent>();
  for (const event of events) {
    deduped.set(event.id, event);
  }

  return [...deduped.values()].sort(
    (left, right) =>
      new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime()
  );
}
