import Link from "next/link";

export const metadata = {
  title: "Terms of Service — VoltPilot",
  description: "Terms governing use of the VoltPilot platform.",
};

export default function TermsPage() {
  return (
    <main id="main-content" className="mx-auto max-w-3xl px-6 py-16">
      <Link href="/" className="text-sm font-medium text-primary hover:underline">
        ← VoltPilot
      </Link>
      <h1 className="mt-6 text-3xl font-semibold tracking-tight">Terms of Service</h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated: August 5, 2026</p>

      <div className="prose prose-neutral mt-10 max-w-none space-y-6 text-sm leading-relaxed text-muted-foreground dark:prose-invert">
        <section className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">Agreement</h2>
          <p>
            By subscribing to or using VoltPilot, you agree to these Terms. If you do not agree, do
            not use the service.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">Service</h2>
          <p>
            VoltPilot provides cloud software for electrical contractors to manage customers,
            projects, estimates, proposals, job costing, and analytics. Features may change as the
            product evolves.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">Accounts</h2>
          <ul className="list-disc space-y-2 pl-5">
            <li>You are responsible for maintaining the security of your account credentials.</li>
            <li>You must provide accurate account and billing information.</li>
            <li>Team members you invite must comply with these Terms.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">Subscriptions and billing</h2>
          <p>
            Paid subscriptions are billed through Stripe. Fees are charged according to the plan
            selected at checkout. You may cancel through the billing portal; access continues until
            the end of the current billing period unless otherwise stated.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">Your data</h2>
          <p>
            You retain ownership of business data you enter into VoltPilot. You grant us a limited
            license to host, process, and display that data solely to provide the service.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">Acceptable use</h2>
          <p>
            You may not misuse the service, attempt unauthorized access, interfere with other users,
            or use VoltPilot for unlawful purposes.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">Disclaimer</h2>
          <p>
            VoltPilot is provided &quot;as is.&quot; Estimates, AI suggestions, and analytics are
            informational tools — you are responsible for final pricing, contracts, and compliance
            with applicable codes and regulations.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">Limitation of liability</h2>
          <p>
            To the maximum extent permitted by law, VoltPilot is not liable for indirect, incidental,
            or consequential damages arising from use of the service.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">Contact</h2>
          <p>
            Questions about these Terms: contact us through your VoltPilot account settings or the
            email address listed on our website.
          </p>
        </section>
      </div>
    </main>
  );
}
