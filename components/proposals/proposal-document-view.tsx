"use client";

import type { ProposalRenderModel } from "@/lib/proposals/proposal-render-service";

type ProposalDocumentViewProps = {
  model: ProposalRenderModel;
  className?: string;
};

function DocumentSection({ title, body }: { title: string; body: string }) {
  return (
    <section className="space-y-2.5">
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
        {title}
      </h3>
      <div className="rounded-xl border border-border/60 bg-muted/10 px-5 py-4">
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
          {body}
        </p>
      </div>
    </section>
  );
}

function LineItemTable({
  title,
  rows,
  accentColor,
}: {
  title: string;
  rows: ProposalRenderModel["lineItemTables"][number]["rows"];
  accentColor: string;
}) {
  if (!rows.length) {
    return null;
  }

  return (
    <div className="space-y-2.5">
      <h4 className="text-sm font-semibold">{title}</h4>
      <div className="overflow-x-auto rounded-xl border border-border/70">
        <table className="w-full min-w-[540px] text-left text-xs">
          <thead style={{ backgroundColor: `${accentColor}12` }}>
            <tr className="text-muted-foreground">
              <th className="px-4 py-2.5 font-medium">Description</th>
              <th className="px-4 py-2.5 text-right font-medium">Qty</th>
              <th className="px-4 py-2.5 font-medium">Unit</th>
              <th className="px-4 py-2.5 text-right font-medium">Unit cost</th>
              <th className="px-4 py-2.5 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {rows.map((row, index) => (
              <tr key={`${row.description}-${index}`}>
                <td className="px-4 py-2.5">{row.description}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{row.quantity}</td>
                <td className="px-4 py-2.5">{row.unit}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{row.unitCost}</td>
                <td className="px-4 py-2.5 text-right tabular-nums font-medium">
                  {row.total}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function ProposalDocumentView({ model, className }: ProposalDocumentViewProps) {
  const { branding, meta } = model;
  const scopeSection = model.textSections.find((section) => section.id === "scope");
  const detailSections = model.textSections.filter((section) => section.id !== "scope");

  return (
    <article
      className={`mx-auto max-w-4xl overflow-hidden rounded-2xl border border-border bg-white text-foreground shadow-xl print:rounded-none print:border-0 print:shadow-none ${className ?? ""}`}
      style={
        {
          "--proposal-primary": branding.primaryColor,
          "--proposal-accent": branding.accentColor,
        } as React.CSSProperties
      }
    >
      <div className="h-1.5" style={{ backgroundColor: branding.primaryColor }} />

      <div className="space-y-10 p-6 sm:p-10 lg:p-12">
        <header className="flex flex-col gap-8 border-b border-border/70 pb-10 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-4">
              {branding.companyLogoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={branding.companyLogoUrl}
                  alt={`${branding.companyName} logo`}
                  className="h-14 max-w-[220px] object-contain"
                />
              ) : null}
              {branding.customerLogoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={branding.customerLogoUrl}
                  alt="Customer logo"
                  className="h-12 max-w-[180px] object-contain opacity-90"
                />
              ) : null}
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                {branding.companyName}
              </h2>
              <div className="mt-2 space-y-0.5 text-sm text-muted-foreground">
                {branding.addressLines.map((line) => (
                  <p key={line}>{line}</p>
                ))}
                {branding.phone ? <p>{branding.phone}</p> : null}
                {branding.email ? <p>{branding.email}</p> : null}
                {branding.website ? <p>{branding.website}</p> : null}
                {branding.licenseNumber ? (
                  <p>License: {branding.licenseNumber}</p>
                ) : null}
              </div>
            </div>
          </div>

          <div
            className="rounded-2xl border p-6 lg:min-w-[280px] lg:text-right"
            style={{
              borderColor: `${branding.primaryColor}25`,
              backgroundColor: `${branding.primaryColor}06`,
            }}
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              Proposal
            </p>
            <p className="mt-1 text-lg font-semibold">{meta.proposalNumber ?? "—"}</p>
            <dl className="mt-4 space-y-1.5 text-sm text-muted-foreground">
              <div className="flex justify-between gap-4 lg:flex-col lg:items-end">
                <dt>Date created</dt>
                <dd className="font-medium text-foreground">{meta.proposalDateLabel}</dd>
              </div>
              {meta.expirationDateLabel ? (
                <div className="flex justify-between gap-4 lg:flex-col lg:items-end">
                  <dt>Expiration</dt>
                  <dd className="font-medium text-foreground">{meta.expirationDateLabel}</dd>
                </div>
              ) : null}
            </dl>
            <p
              className="mt-5 text-3xl font-bold tabular-nums tracking-tight"
              style={{ color: branding.primaryColor }}
            >
              {meta.amountLabel}
            </p>
          </div>
        </header>

        <div className="grid gap-5 md:grid-cols-2">
          <div className="rounded-2xl border border-border/70 bg-muted/10 p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Customer
            </p>
            <p className="mt-2 text-base font-semibold">{model.customer.companyName}</p>
            <p className="text-sm text-muted-foreground">{model.customer.contactName}</p>
            <p className="text-sm text-muted-foreground">{model.customer.email}</p>
            {model.customer.phone ? (
              <p className="text-sm text-muted-foreground">{model.customer.phone}</p>
            ) : null}
          </div>
          <div className="rounded-2xl border border-border/70 bg-muted/10 p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Project
            </p>
            <p className="mt-2 text-base font-semibold">{model.project.name}</p>
            {model.project.address ? (
              <p className="text-sm text-muted-foreground">{model.project.address}</p>
            ) : null}
            {model.project.generalContractor ? (
              <p className="text-sm text-muted-foreground">
                GC: {model.project.generalContractor}
              </p>
            ) : null}
            <p className="text-sm text-muted-foreground">Type: {model.project.type}</p>
          </div>
        </div>

        {scopeSection ? (
          <DocumentSection title={scopeSection.title} body={scopeSection.body} />
        ) : null}

        {model.photos.length > 0 ? (
          <section className="space-y-4">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Project Photos
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              {model.photos.map((photo) => (
                <figure
                  key={photo.id}
                  className="overflow-hidden rounded-2xl border border-border/70 bg-muted/10"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.url}
                    alt={photo.title ?? photo.caption ?? "Project photo"}
                    className="aspect-[4/3] w-full object-cover"
                  />
                  {photo.title || photo.caption ? (
                    <figcaption className="space-y-0.5 px-4 py-3 text-sm">
                      {photo.title ? <p className="font-medium">{photo.title}</p> : null}
                      {photo.caption ? (
                        <p className="text-muted-foreground">{photo.caption}</p>
                      ) : null}
                    </figcaption>
                  ) : null}
                </figure>
              ))}
            </div>
          </section>
        ) : null}

        <div className="space-y-7">
          {detailSections
            .filter((section) =>
              ["materials", "labor", "equipment"].includes(section.id)
            )
            .map((section) => (
              <DocumentSection key={section.id} title={section.title} body={section.body} />
            ))}

          {model.pricingSummary ? (
            <section className="space-y-3">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Estimate Summary
              </h3>
              <div className="rounded-2xl border border-border/70 bg-muted/10 p-5 text-sm">
                <div className="space-y-2.5">
                  {model.pricingSummary.map((row) => (
                    <div
                      key={row.label}
                      className={`flex justify-between gap-4 ${
                        row.emphasized
                          ? "border-t border-border pt-3 text-base font-semibold"
                          : ""
                      }`}
                    >
                      <span>{row.label}</span>
                      <span className="tabular-nums">{row.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          ) : null}

          {model.lineItemTables.length > 0 ? (
            <section className="space-y-5">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Line Item Breakdown
              </h3>
              {model.lineItemTables.map((table) => (
                <LineItemTable
                  key={table.id}
                  title={table.title}
                  rows={table.rows}
                  accentColor={branding.accentColor}
                />
              ))}
            </section>
          ) : null}

          {detailSections
            .filter((section) =>
              !["materials", "labor", "equipment"].includes(section.id)
            )
            .map((section) => (
              <DocumentSection key={section.id} title={section.title} body={section.body} />
            ))}
        </div>

        {model.attachments.length > 0 ? (
          <section className="space-y-3">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Attachments
            </h3>
            <ul className="divide-y divide-border/60 rounded-2xl border border-border/70">
              {model.attachments.map((attachment) => (
                <li key={attachment.id}>
                  <a
                    href={attachment.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between gap-4 px-5 py-3.5 text-sm transition-colors hover:bg-muted/20"
                  >
                    <span className="font-medium">
                      {attachment.title ?? attachment.fileName ?? "Attachment"}
                    </span>
                    {attachment.fileSizeLabel ? (
                      <span className="text-muted-foreground">{attachment.fileSizeLabel}</span>
                    ) : null}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="grid gap-6 border-t border-border/70 pt-10 md:grid-cols-2">
          {[model.signatures.customer, model.signatures.contractor].map((signature) => (
            <div
              key={signature.label}
              className="rounded-2xl border border-border/70 bg-muted/10 p-5"
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                {signature.label}
              </p>
              {signature.imageDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={signature.imageDataUrl}
                  alt={signature.label}
                  className="mt-4 h-16 max-w-full object-contain"
                />
              ) : (
                <div className="mt-6 h-16 border-b border-dashed border-border" />
              )}
              <p className="mt-3 font-medium">{signature.name}</p>
              {signature.title ? (
                <p className="text-sm text-muted-foreground">{signature.title}</p>
              ) : null}
              {signature.signedAtLabel ? (
                <p className="text-xs text-muted-foreground">
                  Signed {signature.signedAtLabel}
                </p>
              ) : null}
            </div>
          ))}
        </section>

        {model.showApprovalNote ? (
          <section
            className="rounded-2xl border p-5"
            style={{
              borderColor: `${branding.primaryColor}30`,
              backgroundColor: `${branding.primaryColor}08`,
            }}
          >
            <p
              className="text-[11px] font-semibold uppercase tracking-[0.2em]"
              style={{ color: branding.primaryColor }}
            >
              Approval
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              By signing above, the customer approves the scope, pricing, and terms outlined
              in this proposal.
            </p>
          </section>
        ) : null}
      </div>
    </article>
  );
}
