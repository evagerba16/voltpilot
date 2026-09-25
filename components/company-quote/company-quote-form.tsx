"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import { submitCompanyQuoteRequest } from "@/app/company-quote/actions";
import { LegalFooterLinks } from "@/components/site/legal-footer-links";
import { Button } from "@/components/ui/button";
import {
  CONTRACTOR_COUNT_RANGES,
  CONTRACTOR_COUNT_RANGE_LABELS,
} from "@/lib/b2b/types";

const inputClassName =
  "flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function CompanyQuoteForm() {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);

    startTransition(async () => {
      const result = await submitCompanyQuoteRequest(formData);

      if (result?.error) {
        setError(result.error);
      }
    });
  }

  return (
    <div className="mx-auto w-full max-w-xl">
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Tell us about your company
        </h1>
        <p className="mt-2 text-sm text-muted-foreground sm:text-base">
          Share a few details and we&apos;ll prepare a company proposal tailored to
          your team. No pricing is calculated automatically.
        </p>

        <form action={handleSubmit} className="mt-8 space-y-5">
          <div className="space-y-2">
            <label htmlFor="company_name" className="text-sm font-medium">
              Company name
            </label>
            <input
              id="company_name"
              name="company_name"
              type="text"
              required
              autoComplete="organization"
              className={inputClassName}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="contact_name" className="text-sm font-medium">
              Contact name
            </label>
            <input
              id="contact_name"
              name="contact_name"
              type="text"
              required
              autoComplete="name"
              className={inputClassName}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="work_email" className="text-sm font-medium">
              Work email
            </label>
            <input
              id="work_email"
              name="work_email"
              type="email"
              required
              autoComplete="work email"
              className={inputClassName}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="phone" className="text-sm font-medium">
              Phone <span className="font-normal text-muted-foreground">(optional)</span>
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              autoComplete="tel"
              className={inputClassName}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="contractor_count_range" className="text-sm font-medium">
              Number of contractors
            </label>
            <select
              id="contractor_count_range"
              name="contractor_count_range"
              required
              defaultValue=""
              className={inputClassName}
            >
              <option value="" disabled>
                Select a range
              </option>
              {CONTRACTOR_COUNT_RANGES.map((range) => (
                <option key={range} value={range}>
                  {CONTRACTOR_COUNT_RANGE_LABELS[range]}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="goals" className="text-sm font-medium">
              What are you looking to accomplish with VoltPilot?
            </label>
            <textarea
              id="goals"
              name="goals"
              required
              rows={5}
              placeholder="For example: streamline estimating for a 12-person commercial team, standardize proposals, and give project managers visibility into the pipeline."
              className="min-h-28 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </div>

          {error ? (
            <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </p>
          ) : null}

          <Button type="submit" size="lg" className="w-full" disabled={pending}>
            {pending ? "Submitting..." : "Request My Company Proposal"}
          </Button>
        </form>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          Looking for a single seat?{" "}
          <Link href="/subscribe" className="font-medium text-foreground underline-offset-4 hover:underline">
            View the $149/month plan
          </Link>
        </p>
      </div>

      <div className="mt-6">
        <LegalFooterLinks />
      </div>
    </div>
  );
}
