import {
  BarChart3,
  Building2,
  ClipboardList,
  FileText,
  Sparkles,
  Users,
} from "lucide-react";

const features = [
  {
    icon: ClipboardList,
    title: "Line-item estimate builder",
    description:
      "Build estimates by labor, materials, equipment, and subcontractors with live totals, autosave, assemblies, templates, and version history.",
  },
  {
    icon: Sparkles,
    title: "AI estimate review",
    description:
      "Review estimates for missing materials, labor gaps, pricing concerns, and scope questions before you finalize a bid.",
  },
  {
    icon: FileText,
    title: "Proposal builder & PDF export",
    description:
      "Turn estimates into professional proposals with scope summaries, terms, and downloadable PDFs ready to send.",
  },
  {
    icon: Building2,
    title: "Customer portal",
    description:
      "Send customers a secure link to view proposals, leave comments, accept or decline, and sign electronically.",
  },
  {
    icon: BarChart3,
    title: "Pipeline analytics",
    description:
      "Track revenue, profit, forecasts, and proposal performance from a dashboard built for residential and commercial contractor workflows.",
  },
  {
    icon: Users,
    title: "Customers, projects & teams",
    description:
      "Manage customer records, link projects, and invite team members with role-based permissions across your organization.",
  },
];

export function Features() {
  return (
    <section id="features" className="border-b border-border/60 py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Everything You Need to Estimate with Confidence
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Purpose-built for residential and commercial electrical contractors
            — from customer and project setup through estimate, proposal, and
            signed job.
          </p>
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="rounded-xl border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="mb-4 flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <feature.icon className="size-5" />
              </div>
              <h3 className="text-lg font-semibold">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
