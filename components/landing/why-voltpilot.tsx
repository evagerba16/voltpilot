import {
  BarChart3,
  Building2,
  ClipboardList,
  FileText,
  Sparkles,
  Users,
} from "lucide-react";

const reasons = [
  {
    icon: Building2,
    title: "One workflow from lead to signed job",
    description:
      "Manage customers and projects, build estimates, send proposals, and track outcomes in a single platform — no spreadsheets handoffs between tools.",
  },
  {
    icon: ClipboardList,
    title: "Estimate builder built for electrical bids",
    description:
      "Line-item estimating with autosave, category totals, assemblies, templates, bulk edits, and version history when you need to compare changes.",
  },
  {
    icon: Sparkles,
    title: "AI review on every estimate",
    description:
      "Run AI review to flag missing materials, labor gaps, pricing concerns, and scope questions before you send a number to the customer.",
  },
  {
    icon: FileText,
    title: "Proposals with a customer portal",
    description:
      "Generate proposal PDFs, email a secure link, and let customers view, comment, accept, decline, and sign electronically.",
  },
  {
    icon: BarChart3,
    title: "Analytics for your pipeline",
    description:
      "Dashboards for revenue, profit, forecasts, and proposal performance so you can see what is winning and where to focus.",
  },
  {
    icon: Users,
    title: "Team roles and permissions",
    description:
      "Invite estimators, project managers, and viewers with role-based access so the right people can view or edit the right work.",
  },
];

export function WhyVoltPilot() {
  return (
    <section id="why-voltpilot" className="border-b border-border/60 bg-muted/30 py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Why Contractors Choose VoltPilot
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Purpose-built tools for residential and commercial electrical
            contractors — from first estimate to signed proposal and profitable
            job.
          </p>
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {reasons.map((reason) => (
            <div
              key={reason.title}
              className="rounded-xl border border-border bg-card p-6 shadow-sm"
            >
              <div className="mb-4 flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <reason.icon className="size-5" />
              </div>
              <h3 className="text-lg font-semibold">{reason.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {reason.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
