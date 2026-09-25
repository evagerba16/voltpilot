import Link from "next/link";
import { CheckCircle2, Zap } from "lucide-react";

import { LegalFooterLinks } from "@/components/site/legal-footer-links";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";

export const metadata = {
  title: "Request Received — VoltPilot",
  description: "Your VoltPilot company quote request was received.",
};

export default function CompanyQuoteSuccessPage() {
  return (
    <main className="min-h-screen bg-muted/30">
      <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 py-16">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Zap className="size-4" />
          </span>
          VoltPilot
        </Link>

        <div className="rounded-xl border border-border bg-card p-8 text-center shadow-sm">
          <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="size-6" />
          </span>
          <h1 className="mt-4 text-2xl font-bold tracking-tight">We received your request</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Thanks for telling us about your company. Our team will review your
            details and follow up with a tailored company proposal — no automatic
            pricing, just a conversation about what your team needs.
          </p>
          <Link href="/" className={cn(buttonVariants({ size: "lg" }), "mt-8 w-full")}>
            Back to VoltPilot
          </Link>
        </div>

        <div className="mt-6">
          <LegalFooterLinks />
        </div>
      </div>
    </main>
  );
}
