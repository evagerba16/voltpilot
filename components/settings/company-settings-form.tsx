"use client";

import { useState, useTransition } from "react";

import { saveCompanySettings } from "@/app/(dashboard)/settings/actions";
import { AlertBanner } from "@/components/ui/alert-banner";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast-provider";
import type { CompanySettings } from "@/lib/company/types";
import {
  inputClassName,
  labelClassName,
  textareaClassName,
} from "@/lib/ui/form-classes";

type CompanySettingsFormProps = {
  settings: CompanySettings;
  canEdit?: boolean;
  readOnlyMessage?: string;
};

export function CompanySettingsForm({
  settings,
  canEdit = true,
  readOnlyMessage,
}: CompanySettingsFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const { success } = useToast();

  function handleSubmit(formData: FormData) {
    setError(null);

    startTransition(async () => {
      const result = await saveCompanySettings(formData);

      if (result.error) {
        setError(result.error);
        return;
      }

      success("Company settings saved.");
    });
  }

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      <div className="border-b border-border px-6 py-4">
        <h1 className="text-xl font-semibold tracking-tight">Company profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure branding and default proposal content used on PDF exports.
        </p>
      </div>

      <form action={handleSubmit} className="space-y-6 px-6 py-5">
        {readOnlyMessage ? (
          <AlertBanner variant="info">{readOnlyMessage}</AlertBanner>
        ) : null}
        <fieldset disabled={!canEdit} className="space-y-6">
        {error ? (
          <AlertBanner variant="error">{error}</AlertBanner>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <label htmlFor="company_name" className={labelClassName}>
              Company name
            </label>
            <input
              id="company_name"
              name="company_name"
              required
              defaultValue={settings.company_name}
              className={inputClassName}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <label htmlFor="company_logo_url" className={labelClassName}>
              Company logo URL
            </label>
            <input
              id="company_logo_url"
              name="company_logo_url"
              defaultValue={settings.company_logo_url ?? ""}
              className={inputClassName}
              placeholder="https://example.com/logo.png"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <label htmlFor="address_line1" className={labelClassName}>
              Address line 1
            </label>
            <input
              id="address_line1"
              name="address_line1"
              defaultValue={settings.address_line1 ?? ""}
              className={inputClassName}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <label htmlFor="address_line2" className={labelClassName}>
              Address line 2
            </label>
            <input
              id="address_line2"
              name="address_line2"
              defaultValue={settings.address_line2 ?? ""}
              className={inputClassName}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="city" className={labelClassName}>
              City
            </label>
            <input id="city" name="city" defaultValue={settings.city ?? ""} className={inputClassName} />
          </div>
          <div className="space-y-2">
            <label htmlFor="state" className={labelClassName}>
              State
            </label>
            <input id="state" name="state" defaultValue={settings.state ?? ""} className={inputClassName} />
          </div>
          <div className="space-y-2">
            <label htmlFor="zip" className={labelClassName}>
              ZIP
            </label>
            <input id="zip" name="zip" defaultValue={settings.zip ?? ""} className={inputClassName} />
          </div>
          <div className="space-y-2">
            <label htmlFor="phone" className={labelClassName}>
              Phone
            </label>
            <input id="phone" name="phone" defaultValue={settings.phone ?? ""} className={inputClassName} />
          </div>
          <div className="space-y-2">
            <label htmlFor="email" className={labelClassName}>
              Email
            </label>
            <input id="email" name="email" type="email" defaultValue={settings.email ?? ""} className={inputClassName} />
          </div>
          <div className="space-y-2">
            <label htmlFor="website" className={labelClassName}>
              Website
            </label>
            <input id="website" name="website" defaultValue={settings.website ?? ""} className={inputClassName} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <label htmlFor="license_number" className={labelClassName}>
              License number
            </label>
            <input
              id="license_number"
              name="license_number"
              defaultValue={settings.license_number ?? ""}
              className={inputClassName}
            />
          </div>
        </div>

        <div className="space-y-4 border-t border-border pt-5">
          <h2 className="text-base font-semibold">Default proposal content</h2>
          <div className="space-y-2">
            <label htmlFor="default_terms" className={labelClassName}>
              Default terms & conditions
            </label>
            <textarea
              id="default_terms"
              name="default_terms"
              rows={4}
              defaultValue={settings.default_terms ?? ""}
              className={textareaClassName}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="default_warranty" className={labelClassName}>
              Default warranty information
            </label>
            <textarea
              id="default_warranty"
              name="default_warranty"
              rows={4}
              defaultValue={settings.default_warranty ?? ""}
              className={textareaClassName}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="default_exclusions" className={labelClassName}>
              Default exclusions
            </label>
            <textarea
              id="default_exclusions"
              name="default_exclusions"
              rows={4}
              defaultValue={settings.default_exclusions ?? ""}
              className={textareaClassName}
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="contractor_signature_name" className={labelClassName}>
                Default contractor signature name
              </label>
              <input
                id="contractor_signature_name"
                name="contractor_signature_name"
                defaultValue={settings.contractor_signature_name ?? ""}
                className={inputClassName}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="contractor_signature_title" className={labelClassName}>
                Default contractor signature title
              </label>
              <input
                id="contractor_signature_title"
                name="contractor_signature_title"
                defaultValue={settings.contractor_signature_title ?? ""}
                className={inputClassName}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end border-t border-border pt-4">
          {canEdit ? (
            <Button type="submit" disabled={pending}>
              {pending ? "Saving..." : "Save settings"}
            </Button>
          ) : null}
        </div>
        </fieldset>
      </form>
    </div>
  );
}
