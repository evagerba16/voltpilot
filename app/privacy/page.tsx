import Link from "next/link";

export const metadata = {
  title: "Privacy Policy — VoltPilot",
  description: "How VoltPilot collects, uses, and protects your data.",
};

export default function PrivacyPage() {
  return (
    <main id="main-content" className="mx-auto max-w-3xl px-6 py-16">
      <Link href="/" className="text-sm font-medium text-primary hover:underline">
        ← VoltPilot
      </Link>
      <h1 className="mt-6 text-3xl font-semibold tracking-tight">Privacy Policy</h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated: August 5, 2026</p>

      <div className="prose prose-neutral mt-10 max-w-none space-y-6 text-sm leading-relaxed text-muted-foreground dark:prose-invert">
        <section className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">Overview</h2>
          <p>
            VoltPilot (&quot;we&quot;, &quot;us&quot;) provides estimating and proposal software for
            electrical contractors. This policy describes how we handle information when you use
            our web application.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">Information we collect</h2>
          <ul className="list-disc space-y-2 pl-5">
            <li>Account information: name, email, company name, and authentication credentials.</li>
            <li>Business data you enter: customers, projects, estimates, proposals, job costing, and files.</li>
            <li>Billing information processed by Stripe (we do not store full payment card numbers).</li>
            <li>Usage and diagnostic data: logs, error reports, and performance metrics when enabled.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">How we use information</h2>
          <ul className="list-disc space-y-2 pl-5">
            <li>Provide and improve the VoltPilot service.</li>
            <li>Process subscriptions and send transactional email (welcome, proposals, notifications).</li>
            <li>Generate AI-assisted insights when you use those features.</li>
            <li>Monitor reliability, security, and support requests.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">Service providers</h2>
          <p>
            We use third-party providers including Supabase (database and authentication), Stripe
            (billing), Resend (email), and OpenAI (optional AI features). Data is shared only as
            needed to operate the service.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">Data retention</h2>
          <p>
            We retain your business data while your account is active. You may request deletion by
            contacting support. Backups may persist for a limited period after deletion.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">Security</h2>
          <p>
            We use industry-standard measures including encrypted connections, row-level security,
            and access controls. No method of transmission over the internet is 100% secure.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">Contact</h2>
          <p>
            Questions about this policy: contact us through your VoltPilot account settings or the
            email address listed on our website.
          </p>
        </section>
      </div>
    </main>
  );
}
