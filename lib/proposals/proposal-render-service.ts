import { formatCurrency, formatProposalDate } from "@/lib/proposals/format";
import {
  assertHexColor,
  assertSafeHttpUrl,
} from "@/lib/security/url-validation";
import type {
  ProposalCompanySnapshot,
  ProposalEditorState,
  ProposalEstimateSnapshot,
  ProposalMediaItem,
  ProposalPortalData,
  ProposalPortalMediaItem,
  ProposalStatus,
  ProposalWithRelations,
} from "@/lib/proposals/types";

export const DEFAULT_PROPOSAL_PRIMARY_COLOR = "#1e3a5f";
export const DEFAULT_PROPOSAL_ACCENT_COLOR = "#0ea5e9";

export type ProposalRenderBranding = {
  companyName: string;
  companyLogoUrl: string | null;
  customerLogoUrl: string | null;
  primaryColor: string;
  accentColor: string;
  addressLines: string[];
  phone: string | null;
  email: string | null;
  website: string | null;
  licenseNumber: string | null;
};

export type ProposalRenderCustomer = {
  companyName: string;
  contactName: string;
  email: string;
  phone: string | null;
};

export type ProposalRenderProject = {
  name: string;
  address: string | null;
  type: string;
  generalContractor: string | null;
};

export type ProposalRenderTextSection = {
  id: string;
  title: string;
  body: string;
};

export type ProposalRenderPricingRow = {
  label: string;
  value: string;
  emphasized?: boolean;
};

export type ProposalRenderLineItemRow = {
  description: string;
  quantity: string;
  unit: string;
  unitCost: string;
  total: string;
};

export type ProposalRenderLineItemTable = {
  id: string;
  title: string;
  rows: ProposalRenderLineItemRow[];
};

export type ProposalRenderMedia = {
  id: string;
  kind: "photo" | "attachment";
  url: string;
  title: string | null;
  caption: string | null;
  fileName: string | null;
  fileSizeLabel: string | null;
};

export type ProposalRenderSignature = {
  label: string;
  name: string;
  title: string | null;
  imageDataUrl: string | null;
  signedAtLabel: string | null;
};

export type ProposalRenderMeta = {
  title: string;
  proposalNumber: string | null;
  status: ProposalStatus;
  proposalDateLabel: string;
  expirationDateLabel: string | null;
  amount: number;
  amountLabel: string;
};

export type ProposalRenderModel = {
  meta: ProposalRenderMeta;
  branding: ProposalRenderBranding;
  customer: ProposalRenderCustomer;
  project: ProposalRenderProject;
  textSections: ProposalRenderTextSection[];
  pricingSummary: ProposalRenderPricingRow[] | null;
  lineItemTables: ProposalRenderLineItemTable[];
  photos: ProposalRenderMedia[];
  attachments: ProposalRenderMedia[];
  signatures: {
    customer: ProposalRenderSignature;
    contractor: ProposalRenderSignature;
  };
  showApprovalNote: boolean;
};

export type BuildProposalRenderModelInput = {
  meta: {
    title: string;
    proposalNumber: string | null;
    status: ProposalStatus;
    proposalDate: string;
    expirationDate: string | null;
    amount: number;
  };
  content: ProposalEditorState;
  company: ProposalCompanySnapshot;
  customer: ProposalRenderCustomer;
  project: ProposalRenderProject;
  estimateSnapshot: ProposalEstimateSnapshot | null;
  customerLogoUrl?: string | null;
  brandPrimaryColor?: string | null;
  brandAccentColor?: string | null;
  media?: ProposalPortalMediaItem[] | ProposalMediaItem[];
  customerSignatureData?: string | null;
  customerSignedAt?: string | null;
  showApprovalNote?: boolean;
};

function resolveBrandingColors(input: BuildProposalRenderModelInput) {
  const snapshotBranding = input.company.branding;

  return {
    primaryColor: assertHexColor(
      input.brandPrimaryColor ?? snapshotBranding?.primary_color,
      DEFAULT_PROPOSAL_PRIMARY_COLOR
    ),
    accentColor: assertHexColor(
      input.brandAccentColor ?? snapshotBranding?.accent_color,
      DEFAULT_PROPOSAL_ACCENT_COLOR
    ),
    customerLogoUrl:
      assertSafeHttpUrl(
        input.customerLogoUrl ?? snapshotBranding?.customer_logo_url ?? ""
      ) ?? null,
  };
}

function formatFileSize(bytes: number | null | undefined) {
  if (!bytes || bytes <= 0) {
    return null;
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function mapMediaItems(
  media: ProposalPortalMediaItem[] | ProposalMediaItem[] | undefined
): ProposalRenderMedia[] {
  if (!media?.length) {
    return [];
  }

  return media
    .map((item) => {
      const safeUrl = assertSafeHttpUrl(item.url);
      if (!safeUrl) {
        return null;
      }

      return {
        id: item.id,
        kind: item.kind,
        url: safeUrl,
        title: item.title,
        caption: item.caption,
        fileName: item.file_name,
        fileSizeLabel: formatFileSize(item.file_size),
      };
    })
    .filter((item): item is ProposalRenderMedia => item !== null);
}

function buildTextSections(content: ProposalEditorState): ProposalRenderTextSection[] {
  const sections: Array<{ id: string; title: string; body: string }> = [
    { id: "scope", title: "Scope of Work", body: content.scope_of_work },
    { id: "materials", title: "Included Materials", body: content.materials_summary },
    { id: "labor", title: "Labor Summary", body: content.labor_summary },
    { id: "equipment", title: "Equipment Summary", body: content.equipment_summary },
    { id: "assumptions", title: "Assumptions", body: content.assumptions },
    { id: "exclusions", title: "Exclusions", body: content.exclusions },
    { id: "terms", title: "Terms & Conditions", body: content.terms_and_conditions },
    { id: "warranty", title: "Warranty Information", body: content.warranty_information },
    { id: "notes", title: "Notes", body: content.notes },
  ];

  return sections
    .filter((section) => section.body.trim().length > 0)
    .map((section) => ({
      id: section.id,
      title: section.title,
      body: section.body.trim(),
    }));
}

function buildPricingSummary(
  estimateSnapshot: ProposalEstimateSnapshot | null
): ProposalRenderPricingRow[] | null {
  if (!estimateSnapshot) {
    return null;
  }

  return [
    {
      label: "Direct cost",
      value: formatCurrency(estimateSnapshot.direct_cost_total),
    },
    {
      label: `Overhead (${estimateSnapshot.overhead_percent}%)`,
      value: formatCurrency(estimateSnapshot.overhead_amount),
    },
    {
      label: `Contingency (${estimateSnapshot.contingency_percent}%)`,
      value: formatCurrency(estimateSnapshot.contingency_amount),
    },
    {
      label: `Profit (${estimateSnapshot.profit_margin_percent}%)`,
      value: formatCurrency(estimateSnapshot.profit_amount),
    },
    {
      label: `Tax (${estimateSnapshot.tax_percent}%)`,
      value: formatCurrency(estimateSnapshot.tax_amount),
    },
    {
      label: "Final selling price",
      value: formatCurrency(estimateSnapshot.selling_price),
      emphasized: true,
    },
  ];
}

function buildLineItemTables(
  content: ProposalEditorState,
  estimateSnapshot: ProposalEstimateSnapshot | null
): ProposalRenderLineItemTable[] {
  if (!content.show_line_item_breakdown || !estimateSnapshot) {
    return [];
  }

  const categories: Array<{ id: string; title: string; key: keyof ProposalEstimateSnapshot["line_items_by_category"] }> = [
    { id: "labor", title: "Labor", key: "labor" },
    { id: "materials", title: "Materials", key: "materials" },
    { id: "equipment", title: "Equipment", key: "equipment" },
    { id: "subcontractors", title: "Subcontractors", key: "subcontractors" },
    { id: "miscellaneous", title: "Miscellaneous", key: "miscellaneous" },
  ];

  return categories
    .map((category) => ({
      id: category.id,
      title: category.title,
      rows: estimateSnapshot.line_items_by_category[category.key].map((item) => ({
        description: item.description || "—",
        quantity: String(item.quantity),
        unit: item.unit,
        unitCost: formatCurrency(item.unit_cost),
        total: formatCurrency(item.total),
      })),
    }))
    .filter((table) => table.rows.length > 0);
}

export function buildProposalRenderModel(
  input: BuildProposalRenderModelInput
): ProposalRenderModel {
  const brandingColors = resolveBrandingColors(input);
  const allMedia = mapMediaItems(input.media);

  return {
    meta: {
      title: input.meta.title,
      proposalNumber: input.meta.proposalNumber,
      status: input.meta.status,
      proposalDateLabel: formatProposalDate(input.meta.proposalDate),
      expirationDateLabel: input.meta.expirationDate
        ? formatProposalDate(input.meta.expirationDate)
        : null,
      amount: input.meta.amount,
      amountLabel: formatCurrency(input.meta.amount),
    },
    branding: {
      companyName: input.company.company_name,
      companyLogoUrl: assertSafeHttpUrl(input.company.company_logo_url ?? "") ?? null,
      customerLogoUrl: brandingColors.customerLogoUrl,
      primaryColor: brandingColors.primaryColor,
      accentColor: brandingColors.accentColor,
      addressLines: input.company.address_lines,
      phone: input.company.phone,
      email: input.company.email,
      website: input.company.website,
      licenseNumber: input.company.license_number,
    },
    customer: input.customer,
    project: input.project,
    textSections: buildTextSections(input.content),
    pricingSummary: buildPricingSummary(input.estimateSnapshot),
    lineItemTables: buildLineItemTables(input.content, input.estimateSnapshot),
    photos: allMedia.filter((item) => item.kind === "photo"),
    attachments: allMedia.filter((item) => item.kind === "attachment"),
    signatures: {
      customer: {
        label: "Customer Signature",
        name: input.content.customer_signature_name || input.customer.contactName,
        title: input.content.customer_signature_title || null,
        imageDataUrl: input.customerSignatureData ?? null,
        signedAtLabel: input.customerSignedAt
          ? formatProposalDate(input.customerSignedAt.slice(0, 10))
          : null,
      },
      contractor: {
        label: "Contractor Signature",
        name: input.content.contractor_signature_name || input.company.company_name,
        title: input.content.contractor_signature_title || null,
        imageDataUrl: null,
        signedAtLabel: null,
      },
    },
    showApprovalNote: input.showApprovalNote ?? true,
  };
}

export function buildProposalRenderModelFromRecord(
  proposal: ProposalWithRelations,
  content: ProposalEditorState,
  company: ProposalCompanySnapshot,
  estimateSnapshot: ProposalEstimateSnapshot | null,
  options?: {
    media?: ProposalMediaItem[];
    customerSignatureData?: string | null;
    customerSignedAt?: string | null;
    showApprovalNote?: boolean;
  }
) {
  return buildProposalRenderModel({
    meta: {
      title: proposal.title,
      proposalNumber: proposal.proposal_number,
      status: proposal.status,
      proposalDate: content.proposal_date,
      expirationDate: content.expiration_date || null,
      amount: proposal.amount,
    },
    content,
    company,
    customer: {
      companyName: proposal.project.customer.company_name,
      contactName: proposal.project.customer.contact_name,
      email: proposal.project.customer.email,
      phone: proposal.project.customer.phone_number,
    },
    project: {
      name: proposal.project.project_name,
      address: proposal.project.project_address,
      type: proposal.project.project_type,
      generalContractor: proposal.project.general_contractor,
    },
    estimateSnapshot,
    customerLogoUrl: proposal.customer_logo_url,
    brandPrimaryColor: proposal.brand_primary_color,
    brandAccentColor: proposal.brand_accent_color,
    media: options?.media,
    customerSignatureData: options?.customerSignatureData,
    customerSignedAt: options?.customerSignedAt,
    showApprovalNote: options?.showApprovalNote,
  });
}

export function buildProposalRenderModelFromPortal(portal: ProposalPortalData) {
  const company: ProposalCompanySnapshot =
    portal.company_snapshot ?? {
      company_name: "Your Company",
      company_logo_url: null,
      address_lines: [],
      phone: null,
      email: null,
      website: null,
      license_number: null,
    };

  return buildProposalRenderModel({
    meta: {
      title: portal.title,
      proposalNumber: portal.proposal_number,
      status: portal.status,
      proposalDate: portal.proposal_date,
      expirationDate: portal.expiration_date,
      amount: portal.amount,
    },
    content: {
      title: portal.title,
      proposal_date: portal.proposal_date?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
      expiration_date: portal.expiration_date?.slice(0, 10) ?? "",
      scope_of_work: portal.scope_of_work ?? "",
      materials_summary: portal.materials_summary ?? "",
      labor_summary: portal.labor_summary ?? "",
      equipment_summary: portal.equipment_summary ?? "",
      show_line_item_breakdown: portal.show_line_item_breakdown,
      assumptions: portal.assumptions ?? "",
      exclusions: portal.exclusions ?? "",
      terms_and_conditions: portal.terms_and_conditions ?? "",
      warranty_information: portal.warranty_information ?? "",
      customer_signature_name: portal.customer_signature_name ?? "",
      customer_signature_title: portal.customer_signature_title ?? "",
      contractor_signature_name: portal.contractor_signature_name ?? "",
      contractor_signature_title: portal.contractor_signature_title ?? "",
      notes: portal.notes ?? "",
      internal_notes: "",
    },
    company,
    customer: {
      companyName: portal.customer.company_name,
      contactName: portal.customer.contact_name,
      email: portal.customer.email,
      phone: portal.customer.phone_number,
    },
    project: {
      name: portal.project.project_name,
      address: portal.project.project_address,
      type: portal.project.project_type,
      generalContractor: portal.project.general_contractor,
    },
    estimateSnapshot: portal.estimate_snapshot,
    customerLogoUrl: portal.customer_logo_url,
    brandPrimaryColor: portal.brand_primary_color,
    brandAccentColor: portal.brand_accent_color,
    media: portal.media ?? [],
    customerSignatureData: portal.customer_signature_data,
    customerSignedAt: portal.customer_signed_at,
  });
}

export function estimatePdfPageCount(model: ProposalRenderModel) {
  let pages = 1;

  if (model.lineItemTables.length > 0) {
    pages += 1;
  }

  pages += 1;
  return pages;
}
