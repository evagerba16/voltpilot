import Link from "next/link";
import { Zap } from "lucide-react";

import { CompanyQuoteForm } from "@/components/company-quote/company-quote-form";

export const metadata = {
  title: "Get a Company Quote — VoltPilot",
  description:
    "Request a tailored VoltPilot company proposal for your electrical contracting team.",
};

export default function CompanyQuotePage() {
  return (
    <main className="min-h-screen bg-muted/30">
      <div className="mx-auto max-w-4xl px-6 py-10 sm:py-16">
        <Link
          href="/#pricing"
          className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Zap className="size-4" />
          </span>
          VoltPilot
        </Link>

        <CompanyQuoteForm />
      </div>
    </main>
  );
}
